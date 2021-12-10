import type { Dash } from '../Dash';
import { DashFile } from './DashFile';
export declare class IncludedFiles {
    protected dash: Dash;
    protected files: DashFile[];
    protected aliases: Map<string, DashFile>;
    constructor(dash: Dash);
    all(): DashFile[];
    filtered(cb: (file: DashFile) => boolean): DashFile[];
    setFiltered(cb: (file: DashFile) => boolean): void;
    get(fileId: string): DashFile | undefined;
    addAlias(alias: string, DashFile: DashFile): void;
    loadAll(): Promise<void>;
}
