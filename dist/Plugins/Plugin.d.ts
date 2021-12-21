import { TCompilerPlugin } from './TCompilerPlugin';
export declare class Plugin {
    readonly pluginId: string;
    protected plugin: Partial<TCompilerPlugin>;
    constructor(pluginId: string, plugin: Partial<TCompilerPlugin>);
    runBuildStartHook(): void | Promise<void> | undefined;
    runIncludeHook(): Maybe<string[]>;
    runTransformPathHook(filePath: string | null): Maybe<string>;
    runReadHook(filePath: string, fileHandle?: {
        getFile(): Promise<File> | File;
    }): any;
    runLoadHook(filePath: string, fileContent: any): any;
    runRegisterAliasesHook(filePath: string, fileContent: any): Maybe<string[]>;
    runRequireHook(filePath: string, fileContent: any): Maybe<string[]>;
    runTransformHook(filePath: string, fileContent: any, dependencies?: Record<string, any>): any;
    runFinalizeBuildHook(filePath: string, fileContent: any): Maybe<string | ArrayBuffer | Uint8Array | Blob>;
    runBuildEndHook(): void | Promise<void> | undefined;
}
