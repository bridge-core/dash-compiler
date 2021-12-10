import { FileSystem, IDirEntry } from '../FileSystem/FileSystem';
export declare class NodeFileSystem extends FileSystem {
    constructor();
    readFile(path: string): Promise<File>;
    writeFile(path: string, content: string | Uint8Array): Promise<void>;
    unlink(path: string): Promise<void>;
    readdir(path: string): Promise<IDirEntry[]>;
    mkdir(path: string): Promise<void>;
}
