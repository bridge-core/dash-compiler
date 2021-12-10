import { Dash } from '../Dash';
export declare class DashFile {
    protected dash: Dash;
    readonly filePath: string;
    outputPath: string | null;
    isDone: boolean;
    data: any;
    readonly fileHandle: {
        getFile: () => Promise<File> | File;
    };
    requiredFiles: Set<string>;
    aliases: Set<string>;
    constructor(dash: Dash, filePath: string);
    setOutputPath(outputPath: string | null): void;
    setReadData(data: any): void;
    setAliases(aliases: Set<string>): void;
    setRequiredFiles(requiredFiles: Set<string>): void;
    processAfterLoad(): Promise<void>;
}
