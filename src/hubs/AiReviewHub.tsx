import { getAnalysis, getAnalysisProviders, getHealth, startAnalysis } from '../api/backendClient';
import { renderFindingsTable } from '../components/FindingsTable';
import { renderRunReviewButton } from '../components/RunReviewButton';
import { AnalysisProvider, AnalysisRequest, AnalysisResult } from '../common/types';
import { describePullRequestAction } from '../contributions/prAction';
import { describeRepositoryContextAction } from '../contributions/repoContextAction';
import { enrichRepositoryContext, getPullRequestId, getRepositoryContext, initializeExtensionHost, notifyExtensionLoadFailed, notifyExtensionLoaded, RepositoryContext, waitForExtensionHost } from '../sdk/init';

const backendUrlStorageKey = 'devops-ai-extension.apiBaseUrl';
const providerStorageKey = 'devops-ai-extension.provider';
const analysisStorageKeyPrefix = 'devops-ai-extension.analysis';
const maxPollingAttempts = 80;
const pollingDelayMs = 5000;

let progressTimerId: number | undefined;
let currentProgressStatus = 'ready';

function setProviderOptions(select: HTMLSelectElement, providers: AnalysisProvider[], preferredProvider?: string): void {
    const distinctProviders = providers
        .map((provider) => provider.trim())
        .filter((provider, index, values) => provider.length > 0 && values.indexOf(provider) === index);
    const availableProviders = distinctProviders.length > 0 ? distinctProviders : ['mock'];
    const selectedProvider = preferredProvider && availableProviders.includes(preferredProvider)
        ? preferredProvider
        : availableProviders[0];

    select.innerHTML = availableProviders
        .map((provider) => `<option value="${provider}">${provider}</option>`)
        .join('');
    select.value = selectedProvider;
}

async function loadProviderOptions(apiBaseUrl: string | undefined, select: HTMLSelectElement, preferredProvider?: string): Promise<void> {
    if (!apiBaseUrl) {
        setProviderOptions(select, ['mock'], preferredProvider);
        return;
    }

    try {
        const response = await getAnalysisProviders(apiBaseUrl);
        setProviderOptions(select, response.providers, preferredProvider);
    } catch {
        setProviderOptions(select, ['mock'], preferredProvider);
    }
}

let repositoryContext: RepositoryContext = {
    collectionName: undefined,
    project: undefined,
    repositoryId: undefined,
    repositoryName: undefined,
    pullRequestId: undefined
};

function loadStoredValue(key: string): string | undefined {
    const value = window.localStorage.getItem(key)?.trim();
    return value ? value : undefined;
}

function saveStoredValue(key: string, value: string): void {
    const normalizedValue = value.trim();

    if (normalizedValue) {
        window.localStorage.setItem(key, normalizedValue);
        return;
    }

    window.localStorage.removeItem(key);
}

function getAnalysisStorageKey(context: RepositoryContext): string | undefined {
    if (!context.project || !context.repositoryId || !context.pullRequestId) {
        return undefined;
    }

    return `${analysisStorageKeyPrefix}.${context.project}.${context.repositoryId}.${context.pullRequestId}`;
}

function loadStoredAnalysis(context: RepositoryContext): AnalysisResult | undefined {
    const storageKey = getAnalysisStorageKey(context);
    if (!storageKey) {
        return undefined;
    }

    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
        return undefined;
    }

    try {
        return JSON.parse(rawValue) as AnalysisResult;
    } catch {
        window.localStorage.removeItem(storageKey);
        return undefined;
    }
}

function saveStoredAnalysis(context: RepositoryContext, result: AnalysisResult): void {
    const storageKey = getAnalysisStorageKey(context);
    if (!storageKey) {
        return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(result));
}

function getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element '${id}' was not found.`);
    }

    return element as T;
}

function setStatus(message: string): void {
    getElement<HTMLDivElement>('status').textContent = message;
}

function setProgressDetails(status: string, startedAt: number): void {
    currentProgressStatus = status;
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    getElement<HTMLDivElement>('progressDetails').textContent = `Analysis status: ${status} - ${elapsedSeconds}s`;
}

function stopProgressTimer(): void {
    if (progressTimerId !== undefined) {
        window.clearInterval(progressTimerId);
        progressTimerId = undefined;
    }
}

function startProgressTimer(status: string, startedAt: number): void {
    stopProgressTimer();
    currentProgressStatus = status;
    progressTimerId = window.setInterval(() => {
        setProgressDetails(currentProgressStatus, startedAt);
    }, 1000);
}

function renderAnalysis(result: AnalysisResult): void {
    const details = getElement<HTMLDivElement>('analysisDetails');
    details.innerHTML = `
        <h2>Summary</h2>
        <p>${result.summary || 'No summary.'}</p>
        <h2>Findings</h2>
        ${renderFindingsTable(result.findings, {
            collectionName: repositoryContext.collectionName,
            project: result.project,
            repositoryId: result.repositoryId,
            repositoryName: repositoryContext.repositoryName,
            pullRequestId: result.pullRequestId
        })}`;
}

async function pollAnalysis(baseUrl: string, analysisId: string): Promise<void> {
    const startedAt = Date.now();
    startProgressTimer('running', startedAt);

    for (let attempt = 0; attempt < maxPollingAttempts; attempt += 1) {
        const result = await getAnalysis(baseUrl, analysisId);
        setProgressDetails(result.status, startedAt);

        if (result.status === 'completed' || result.status === 'failed') {
            stopProgressTimer();
            saveStoredAnalysis(repositoryContext, result);
            renderAnalysis(result);
            return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, pollingDelayMs));
    }

    stopProgressTimer();
    setStatus('Analysis is still running. Wait a little longer, then refresh the AI Review tab to check the latest result.');
}

async function runReview(): Promise<void> {
    const apiBaseUrl = getElement<HTMLInputElement>('apiBaseUrl').value.trim();
    const provider = getElement<HTMLSelectElement>('provider').value as AnalysisProvider;

    if (!apiBaseUrl) {
        setStatus('Enter the backend API base URL first.');
        return;
    }

    if (!repositoryContext.pullRequestId) {
        setStatus('Open the AI Review pull request tab to run a live review.');
        return;
    }

    if (!repositoryContext.project || !repositoryContext.repositoryId) {
        setStatus('Azure DevOps repository context is unavailable for this page. Open the hub from a repository pull request.');
        return;
    }

    const { collectionName, project, repositoryId, pullRequestId } = repositoryContext;

    if (!collectionName) {
        setStatus('Azure DevOps collection context is unavailable for this page.');
        return;
    }

    const request: AnalysisRequest = {
        collectionName,
        project,
        repositoryId,
        pullRequestId,
        scope: 'pr-diff',
        analysisProfile: 'security',
        provider
    };

    setStatus(`Starting ${provider} analysis ...`);
    setProgressDetails('starting', Date.now());
    const run = await startAnalysis(apiBaseUrl, request);
    await pollAnalysis(apiBaseUrl, run.analysisId);
}

export async function initializeAiReviewHub(): Promise<void> {
    try {
        const host = initializeExtensionHost();

        await waitForExtensionHost();

        repositoryContext = await enrichRepositoryContext(getRepositoryContext());
        repositoryContext.pullRequestId = getPullRequestId(repositoryContext);

        const actions = [
            describePullRequestAction({ project: repositoryContext.project, repositoryId: repositoryContext.repositoryId, pullRequestId: repositoryContext.pullRequestId }),
            describeRepositoryContextAction({ project: repositoryContext.project, repositoryId: repositoryContext.repositoryId })
        ];
        const apiBaseUrlInput = getElement<HTMLInputElement>('apiBaseUrl');
        const providerSelect = getElement<HTMLSelectElement>('provider');
        const storedApiBaseUrl = loadStoredValue(backendUrlStorageKey);
        const storedProvider = loadStoredValue(providerStorageKey);

        if (storedApiBaseUrl) {
            apiBaseUrlInput.value = storedApiBaseUrl;
        }

        await loadProviderOptions(storedApiBaseUrl, providerSelect, storedProvider);

        const cachedAnalysis = loadStoredAnalysis(repositoryContext);

        getElement<HTMLDivElement>('hubMeta').textContent = `Host=${host.hostType}; Origin=${host.origin}; ${actions.join(' | ')}`;
        getElement<HTMLDivElement>('reviewActions').innerHTML = renderRunReviewButton({ label: `Run ${providerSelect.value} review` });

        if (cachedAnalysis) {
            renderAnalysis(cachedAnalysis);
            setStatus('Restored last analysis for this pull request.');
        }

        if (!repositoryContext.project || !repositoryContext.repositoryId) {
            setStatus(`Azure DevOps pull request context is incomplete for this view. Resolved project=${repositoryContext.project ?? 'unknown'}, repository=${repositoryContext.repositoryId ?? 'unknown'}, pr=${repositoryContext.pullRequestId ?? 0}. Health checks still work, but live reviews require full PR context.`);
        }

        providerSelect.addEventListener('change', () => {
            saveStoredValue(providerStorageKey, providerSelect.value);
            getElement<HTMLDivElement>('reviewActions').innerHTML = renderRunReviewButton({ label: `Run ${providerSelect.value} review` });
        });

        apiBaseUrlInput.addEventListener('change', async () => {
            saveStoredValue(backendUrlStorageKey, apiBaseUrlInput.value);
            await loadProviderOptions(apiBaseUrlInput.value.trim(), providerSelect, loadStoredValue(providerStorageKey));
            getElement<HTMLDivElement>('reviewActions').innerHTML = renderRunReviewButton({ label: `Run ${providerSelect.value} review` });
        });

        apiBaseUrlInput.addEventListener('blur', async () => {
            saveStoredValue(backendUrlStorageKey, apiBaseUrlInput.value);
            await loadProviderOptions(apiBaseUrlInput.value.trim(), providerSelect, loadStoredValue(providerStorageKey));
            getElement<HTMLDivElement>('reviewActions').innerHTML = renderRunReviewButton({ label: `Run ${providerSelect.value} review` });
        });

        const healthButton = getElement<HTMLButtonElement>('checkHealth');
        healthButton.addEventListener('click', async () => {
            try {
                const apiBaseUrl = getElement<HTMLInputElement>('apiBaseUrl').value.trim();
                const health = await getHealth(apiBaseUrl);
                setStatus(`Health: ${JSON.stringify(health)}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                setStatus(`Health check failed. ${message}`);
            }
        });

        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement | null;
            if (target?.id === 'runReviewButton') {
                void runReview().catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : String(error);
                    setStatus(`Review failed. ${message}`);
                });
            }
        });

        notifyExtensionLoaded();
    } catch (error) {
        notifyExtensionLoadFailed(error);
        throw error;
    }
}
