export interface IDirEntry {
    name: string;
    kind: 'file' | 'directory';
}
export declare abstract class FileSystem {
    abstract readFile(path: string): Promise<File>;
    abstract writeFile(path: string, content: string | Uint8Array): Promise<void>;
    abstract unlink(path: string): Promise<void>;
    abstract readdir(path: string): Promise<IDirEntry[]>;
    abstract mkdir(path: string): Promise<void>;
    allFiles(path: string): Promise<string[]>;
    writeJson(path: string, content: any, beautify?: boolean): Promise<void>;
    readJson(path: string): Promise<any>;
    abstract lastModified(filePath: string): Promise<number>;
    watchDirectory(path: string, onChange: (filePath: string, changeType: unknown) => void): void;
}
