import { Finding } from '../common/types';

interface FindingsTableContext {
    collectionName?: string;
    project?: string;
    repositoryName?: string;
    repositoryId?: string;
    pullRequestId?: number;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getSeverityColor(severity: string): string {
    switch (severity.toLowerCase()) {
        case 'high':
            return '#d13438';
        case 'medium':
            return '#ffb900';
        default:
            return 'inherit';
    }
}

function getFileName(filePath: string): string {
    const segments = filePath.split('/').filter(Boolean);
    return segments[segments.length - 1] || filePath;
}

function buildFileHref(filePath: string, line: number | null | undefined, context?: FindingsTableContext): string | undefined {
    if (!context?.collectionName || !context.project || !context.repositoryName || !context.pullRequestId || !filePath) {
        return undefined;
    }

    const params = new URLSearchParams({
        path: filePath,
        _a: 'files'
    });

    return `/${context.collectionName}/${context.project}/_git/${context.repositoryName}/pullrequest/${context.pullRequestId}?${params.toString()}`;
}

function renderFileCell(finding: Finding, context?: FindingsTableContext): string {
    const fileName = escapeHtml(getFileName(finding.filePath));
    const fullPath = escapeHtml(finding.filePath);
    const href = buildFileHref(finding.filePath, finding.line, context);

    if (!href) {
        return `<span title="${fullPath}">${fileName}</span>`;
    }

    return `<a href="${escapeHtml(href)}" title="${fullPath}" target="_top" style="color:inherit;text-decoration:none;">${fileName}</a>`;
}

export function renderFindingsTable(findings: Finding[], context?: FindingsTableContext): string {
    if (!findings.length) {
        return '<p>No findings yet.</p>';
    }

    const rows = findings.map((finding) => `
        <tr>
            <td style="border-bottom:1px solid #eee;padding:8px;color:${getSeverityColor(finding.severity)};">${escapeHtml(finding.severity)}</td>
            <td style="border-bottom:1px solid #eee;padding:8px 6px;font-family:monospace;font-size:12px;overflow-wrap:anywhere;word-break:break-word;">${renderFileCell(finding, context)}</td>
            <td style="border-bottom:1px solid #eee;padding:8px;">${finding.line ?? ''}</td>
            <td style="border-bottom:1px solid #eee;padding:8px;">${escapeHtml(finding.title)}</td>
            <td style="border-bottom:1px solid #eee;padding:8px;">${escapeHtml(finding.recommendation)}</td>
        </tr>`).join('');

    return `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr>
                    <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Severity</th>
                    <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">File</th>
                    <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Line</th>
                    <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Title</th>
                    <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Recommendation</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}