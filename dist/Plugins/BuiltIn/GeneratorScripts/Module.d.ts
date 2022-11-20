import type { FileSystem } from '../../../FileSystem/FileSystem';
import type { Console } from '../../../Common/Console';
export interface IModuleOpts {
    generatorPath: string;
    omitUsedTemplates: Set<string>;
    fileSystem: FileSystem;
    console: Console;
}
interface IUseTemplateOptions {
    omitTemplate?: boolean;
}
export declare function useTemplate(filePath: string, { omitTemplate }?: IUseTemplateOptions): Promise<any>;
export declare function createCollection(): any;
export {};
