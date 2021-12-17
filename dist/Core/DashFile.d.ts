import { Dash } from '../Dash';
export declare class DashFile {
    protected dash: Dash<any>;
    readonly filePath: string;
    readonly isVirtual: boolean;
    outputPath: string | null;
    isDone: boolean;
    data: any;
    readonly fileHandle?: {
        getFile: () => Promise<File> | File;
    };
    requiredFiles: Set<string>;
    aliases: Set<string>;
    lastModified: number;
    constructor(dash: Dash<any>, filePath: string, isVirtual?: boolean);
    setOutputPath(outputPath: string | null): void;
    setReadData(data: any): void;
    setAliases(aliases: Set<string>): void;
    setRequiredFiles(requiredFiles: Set<string>): void;
    processAfterLoad(): Promise<void>;
    serialize(): {
        isVirtual: boolean;
        filePath: string;
        lastModified: number;
        aliases: string[];
        requiredFiles: string[];
    };
}
