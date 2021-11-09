import type { Dash } from '../Dash';
export declare class IncludedFiles {
    protected dash: Dash;
    protected files: string[];
    constructor(dash: Dash);
    all(): string[];
    filtered(cb: (filePath: string) => boolean): string[];
    loadAll(): Promise<void>;
}
