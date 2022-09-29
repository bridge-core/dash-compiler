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
    getFromFilePath(filePath: string): DashFile | undefined;
    query(query: string): DashFile[];
    addAlias(alias: string, DashFile: DashFile): void;
    queryGlob(glob: string): DashFile[];
    loadAll(): Promise<void>;
    addOne(filePath: string, isVirtual?: boolean): DashFile;
    add(filePaths: string[], isVirtual?: boolean): DashFile[];
    remove(filePath: string): void;
    save(filePath: string): Promise<void>;
    load(filePath: string): Promise<void>;
    resetAll(): void;
    removeAll(): void;
}
