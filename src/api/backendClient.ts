import { AnalysisProvidersResponse, AnalysisRequest, AnalysisResult, AnalysisRunResponse, HealthResponse } from '../common/types';

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/$/, '');
}

async function readJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
}

export async function getHealth(baseUrl: string): Promise<HealthResponse> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/health`, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        }
    });

    return readJson<HealthResponse>(response);
}

export async function getAnalysisProviders(baseUrl: string): Promise<AnalysisProvidersResponse> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/analysis/providers`, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        }
    });

    return readJson<AnalysisProvidersResponse>(response);
}

export async function startAnalysis(baseUrl: string, request: AnalysisRequest): Promise<AnalysisRunResponse> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/analysis/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(request)
    });

    return readJson<AnalysisRunResponse>(response);
}

export async function getAnalysis(baseUrl: string, analysisId: string): Promise<AnalysisResult> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/analysis/${analysisId}`, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        }
    });

    return readJson<AnalysisResult>(response);
}