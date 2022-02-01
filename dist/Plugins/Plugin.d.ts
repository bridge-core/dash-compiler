import { Dash } from '../Dash';
import { TCompilerPlugin } from './TCompilerPlugin';
export declare class Plugin {
    protected dash: Dash;
    readonly pluginId: string;
    protected plugin: Partial<TCompilerPlugin>;
    constructor(dash: Dash, pluginId: string, plugin: Partial<TCompilerPlugin>);
    runBuildStartHook(): Promise<void>;
    runIncludeHook(): Promise<(string | [string, {
        isVirtual?: boolean | undefined;
    }])[] | null | undefined>;
    runTransformPathHook(filePath: string | null): Promise<string | null | undefined>;
    runReadHook(filePath: string, fileHandle?: {
        getFile(): Promise<File> | File;
    }): Promise<any>;
    runLoadHook(filePath: string, fileContent: any): Promise<any>;
    runRegisterAliasesHook(filePath: string, fileContent: any): Promise<string[] | null | undefined>;
    runRequireHook(filePath: string, fileContent: any): Promise<string[] | null | undefined>;
    runTransformHook(filePath: string, fileContent: any, dependencies?: Record<string, any>): Promise<any>;
    runFinalizeBuildHook(filePath: string, fileContent: any): Promise<string | ArrayBuffer | Blob | null | undefined>;
    runBuildEndHook(): Promise<void>;
}
