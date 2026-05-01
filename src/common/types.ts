export type AnalysisProvider = string;

export interface AnalysisProvidersResponse {
    providers: AnalysisProvider[];
}

export interface HealthResponse {
    status: string;
    azureDevOpsConfigured: boolean;
    azureOpenAiConfigured: boolean;
}

export interface AnalysisRequest {
    collectionName: string;
    project: string;
    repositoryId: string;
    pullRequestId: number;
    scope: string;
    analysisProfile: string;
    provider: AnalysisProvider;
}

export interface AnalysisRunResponse {
    analysisId: string;
}

export interface Finding {
    filePath: string;
    line?: number | null;
    severity: string;
    category: string;
    title: string;
    explanation: string;
    recommendation: string;
}

export interface AnalysisResult {
    analysisId: string;
    status: string;
    summary: string;
    findings: Finding[];
    project: string;
    repositoryId: string;
    pullRequestId: number;
}

export interface ReviewViewModel {
    apiBaseUrl: string;
    health?: HealthResponse;
    analysis?: AnalysisResult;
    error?: string;
}