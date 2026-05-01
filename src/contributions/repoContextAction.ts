export interface RepositoryContextAction {
    project?: string;
    repositoryId?: string;
}

export function describeRepositoryContextAction(context: RepositoryContextAction): string {
    return `Repository action ready for project=${context.project ?? 'unknown'}, repo=${context.repositoryId ?? 'unknown'}`;
}