import { TCompilerPlugin } from './TCompilerPlugin';
export declare class Plugin {
    protected plugin: Partial<TCompilerPlugin>;
    constructor(plugin: Partial<TCompilerPlugin>);
    runBuildStartHook(): void | Promise<void> | undefined;
    runIncludeHook(): Maybe<string[]>;
    runTransformPathHook(filePath: string | null): Maybe<string>;
    runReadHook(filePath: string): any;
    runLoadHook(filePath: string, fileContent: any): any;
    runRegisterAliasesHook(filePath: string, fileContent: any): Maybe<string[]>;
    runRequireHook(filePath: string, fileContent: any): Maybe<string[]>;
    runTransformHook(filePath: string, fileContent: any, dependencies?: Record<string, any>): any;
    runFinalizeBuildHook(filePath: string, fileContent: any): Maybe<string | ArrayBuffer | Uint8Array | Blob>;
    runBuildEndHook(): void | Promise<void> | undefined;
}
