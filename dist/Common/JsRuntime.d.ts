import { Runtime } from '@bridge-editor/js-runtime';
import { FileSystem } from '../FileSystem/FileSystem';
export declare class JsRuntime extends Runtime {
    protected fs: FileSystem;
    constructor(fs: FileSystem, modules?: [string, any][]);
    readFile(filePath: string): Promise<File>;
    deleteModule(moduleName: string): void;
}
