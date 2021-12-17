import type { Dash } from '../Dash';
import { DashFile } from './DashFile';
export declare class IncludedFiles {
    protected dash: Dash<any>;
    protected files: Map<string, DashFile>;
    protected aliases: Map<string, DashFile>;
    protected queryCache: Map<string, DashFile[]>;
    constructor(dash: Dash<any>);
    all(): DashFile[];
    filtered(cb: (file: DashFile) => boolean): DashFile[];
    get(fileId: string): DashFile | undefined;
    addAlias(alias: string, DashFile: DashFile): void;
    queryGlob(glob: string): DashFile[];
    loadAll(): Promise<void>;
    add(filePaths: string[], isVirtual?: boolean): void;
    save(filePath: string): Promise<void>;
}
