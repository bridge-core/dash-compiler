export declare abstract class FileSystem {
    abstract iterateDirectory(path: string, callback: (relativePath: string) => Promise<void> | void): Promise<void>;
    abstract readFile(path: string): Promise<File>;
    abstract writeFile(path: string, content: string | Uint8Array): Promise<void>;
    abstract unlink(path: string): Promise<void>;
    abstract mkdir(path: string): Promise<void>;
    abstract allFiles(path: string): Promise<string[]>;
    writeJson(path: string, content: any, beautify?: boolean): Promise<void>;
    readJson(path: string): Promise<any>;
    watchDirectory(path: string, onChange: (filePath: string, changeType: unknown) => void): void;
}
