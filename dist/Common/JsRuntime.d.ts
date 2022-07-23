import { Runtime } from 'bridge-js-runtime';
import { FileSystem } from '../FileSystem/FileSystem';
export declare class JsRuntime extends Runtime {
    protected fs: FileSystem;
    constructor(fs: FileSystem, modules?: [string, any][]);
    protected readFile(filePath: string): Promise<string>;
    deleteModule(moduleName: string): void;
}
