export interface PullRequestActionContext {
    project?: string;
    repositoryId?: string;
    pullRequestId?: number;
}

export function describePullRequestAction(context: PullRequestActionContext): string {
    return `PR action ready for project=${context.project ?? 'unknown'}, repo=${context.repositoryId ?? 'unknown'}, pr=${context.pullRequestId ?? 0}`;
}