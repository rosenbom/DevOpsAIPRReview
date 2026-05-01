export interface RunReviewButtonOptions {
    label?: string;
    disabled?: boolean;
}

export function renderRunReviewButton(options?: RunReviewButtonOptions): string {
    const label = options?.label ?? 'Run review';
    const disabled = options?.disabled ? 'disabled' : '';
    return `<button id="runReviewButton" type="button" ${disabled}>${label}</button>`;
}