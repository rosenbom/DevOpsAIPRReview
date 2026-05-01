import * as DevOps from 'azure-devops-extension-sdk';

interface GitAwareContext {
    collection?: {
        name?: string;
    };
    project?: {
        name?: string;
    };
    repository?: {
        id?: string;
        name?: string;
    };
    pullRequest?: {
        pullRequestId?: number;
    };
}

interface VersionControlRepositoryService {
    getCurrentGitRepository(): Promise<{
        id?: string;
        name?: string;
    } | null>;
}

interface PullRequestTabConfiguration {
    pullRequestId?: number;
    pullRequest?: {
        pullRequestId?: number;
        repository?: {
            id?: string;
            name?: string;
        };
        repositoryId?: string;
    };
    repository?: {
        id?: string;
        name?: string;
    };
    repositoryId?: string;
}

export interface RepositoryContext {
    collectionName: string | undefined;
    project: string | undefined;
    repositoryId: string | undefined;
    repositoryName: string | undefined;
    pullRequestId: number | undefined;
}

export interface ExtensionHostContext {
    hostType: string;
    isFramed: boolean;
    origin: string;
}

export function initializeExtensionHost(): ExtensionHostContext {
    DevOps.init({
        loaded: false,
        applyTheme: true
    });

    return {
        hostType: window.self !== window.top ? 'iframe' : 'window',
        isFramed: window.self !== window.top,
        origin: window.location.origin
    };
}

export async function waitForExtensionHost(): Promise<void> {
    await DevOps.ready();
}

export function notifyExtensionLoaded(): void {
    DevOps.notifyLoadSucceeded();
}

export function notifyExtensionLoadFailed(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    DevOps.notifyLoadFailed(message);
}

export function getRepositoryContext(): RepositoryContext {
    const webContext = DevOps.getWebContext() as unknown as GitAwareContext;
    const pageContext = DevOps.getPageContext() as { webContext?: GitAwareContext };
    const configuration = DevOps.getConfiguration() as PullRequestTabConfiguration | undefined;
    const host = DevOps.getHost();

    const collectionName = webContext.collection?.name ?? pageContext.webContext?.collection?.name ?? host.name;
    const project = webContext.project?.name ?? pageContext.webContext?.project?.name;
    const repositoryId = configuration?.pullRequest?.repository?.id
        ?? configuration?.pullRequest?.repositoryId
        ?? configuration?.repository?.id
        ?? configuration?.repositoryId
        ?? webContext.repository?.id
        ?? pageContext.webContext?.repository?.id;
    const repositoryName = configuration?.pullRequest?.repository?.name
        ?? configuration?.repository?.name
        ?? webContext.repository?.name
        ?? pageContext.webContext?.repository?.name;

    return {
        collectionName,
        project,
        repositoryId,
        repositoryName,
        pullRequestId: configuration?.pullRequest?.pullRequestId
            ?? configuration?.pullRequestId
            ?? pageContext.webContext?.pullRequest?.pullRequestId
    };
}

export async function enrichRepositoryContext(repositoryContext: RepositoryContext): Promise<RepositoryContext> {
    if (repositoryContext.repositoryId && repositoryContext.pullRequestId) {
        return repositoryContext;
    }

    const enrichedContext = { ...repositoryContext };

    if (!enrichedContext.repositoryId) {
        const repositoryService = await DevOps.getService<VersionControlRepositoryService>('ms.vss-code-web.version-control-repository-service');
        const currentRepository = await repositoryService?.getCurrentGitRepository();

        if (currentRepository) {
            enrichedContext.repositoryId = currentRepository.id ?? enrichedContext.repositoryId;
            enrichedContext.repositoryName = currentRepository.name ?? enrichedContext.repositoryName;
        }
    }

    return enrichedContext;
}

export function getPullRequestId(repositoryContext: RepositoryContext): number | undefined {
    return repositoryContext.pullRequestId;
}
