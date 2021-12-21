import { Dash } from '../Dash';
export interface IFileHandle {
    getFile: () => Promise<File> | File;
}
export declare class DashFile {
    protected dash: Dash<any>;
    readonly filePath: string;
    readonly isVirtual: boolean;
    outputPath: string | null;
    isDone: boolean;
    data: any;
    fileHandle?: IFileHandle;
    requiredFiles: Set<string>;
    aliases: Set<string>;
    lastModified: number;
    protected updateFiles: Set<DashFile>;
    constructor(dash: Dash<any>, filePath: string, isVirtual?: boolean);
    setFileHandle(fileHandle: IFileHandle): void;
    setDefaultFileHandle(): void;
    setOutputPath(outputPath: string | null): void;
    setReadData(data: any): void;
    setAliases(aliases: Set<string>): void;
    setRequiredFiles(requiredFiles: Set<string>): void;
    setUpdateFiles(files: string[]): void;
    addUpdateFile(file: DashFile): void;
    getHotUpdateChain(): Set<DashFile>;
    filesToLoadForHotUpdate(visited?: Set<DashFile>, didFileChange?: boolean): Set<DashFile>;
    processAfterLoad(writeFiles: boolean): Promise<void>;
    serialize(): {
        isVirtual: boolean;
        filePath: string;
        lastModified: number;
        aliases: string[];
        requiredFiles: string[];
        updateFiles: string[];
    };
    reset(): void;
}
export interface ISerializedDashFile {
    isVirtual: boolean;
    filePath: string;
    lastModified: number;
    aliases: string[];
    requiredFiles: string[];
    updateFiles: string[];
}
