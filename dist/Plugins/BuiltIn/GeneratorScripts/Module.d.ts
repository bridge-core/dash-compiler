import { FileSystem } from '../../../FileSystem/FileSystem';
import { Console } from '../../../Common/Console';
import { Collection } from './Collection';
export interface IModuleOpts {
    generatorPath: string;
    omitUsedTemplates: Set<string>;
    fileSystem: FileSystem;
    console: Console;
}
interface IUseTemplateOptions {
    omitTemplate?: boolean;
}
export declare function createModule({ generatorPath, omitUsedTemplates, fileSystem, console, }: IModuleOpts): {
    useTemplate: (filePath: string, { omitTemplate }?: IUseTemplateOptions) => Promise<any>;
    createCollection: () => Collection;
};
export {};
