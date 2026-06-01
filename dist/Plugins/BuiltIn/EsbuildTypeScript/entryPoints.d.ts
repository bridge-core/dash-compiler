import { FileSystem } from '../../../main';
export declare function findScriptFiles(path: string, fileSystem: FileSystem): Promise<string[]>;
export declare function expandEntryPoints(entrySpecs: string[], scriptsPath: string, fileSystem: FileSystem): Promise<string[]>;
