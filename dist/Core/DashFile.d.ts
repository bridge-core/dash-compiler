import { Dash } from '../Dash';
export interface IFileHandle {
    getFile: () => Promise<File | null> | File | null;
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
    protected updateFiles: Set<DashFile>;
    protected metadata: Map<string, any>;
    protected ignoredByPlugins: Set<string>;
    constructor(dash: Dash<any>, filePath: string, isVirtual?: boolean);
    isIgnoredBy(pluginId: string): boolean;
    addIgnoredPlugin(pluginId: string): void;
    setFileHandle(fileHandle: IFileHandle): void;
    setDefaultFileHandle(): void;
    setOutputPath(outputPath: string | null): void;
    setReadData(data: any): void;
    setAliases(aliases: Set<string>): void;
    setRequiredFiles(requiredFiles: Set<string>): void;
    addRequiredFile(filePath: string): void;
    setUpdateFiles(files: string[]): void;
    addUpdateFile(file: DashFile): void;
    removeUpdateFile(file: DashFile): void;
    setMetadata(from?: IMetadata): void;
    addMetadata(key: string, value: any): void;
    deleteMetadata(key: string): void;
    getMetadata(key: string): any;
    getAllMetadata(): {
        [k: string]: any;
    };
    getHotUpdateChain(): Set<DashFile>;
    filesToLoadForHotUpdate(visited?: Set<DashFile>, didFileChange?: boolean): Set<DashFile>;
    processAfterLoad(writeFiles: boolean, copyFilePromises: Promise<void>[]): void;
    serialize(): {
        isVirtual: boolean;
        filePath: string;
        aliases: string[];
        requiredFiles: string[];
        updateFiles: string[];
        metadata: {
            [k: string]: any;
        } | undefined;
    };
    reset(): void;
}
export interface ISerializedDashFile {
    isVirtual: boolean;
    filePath: string;
    aliases: string[];
    requiredFiles: string[];
    updateFiles: string[];
    metadata?: IMetadata;
}
export interface IMetadata {
    generatedFiles?: string[];
    [key: string]: any;
}
