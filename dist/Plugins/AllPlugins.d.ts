import type { DashFile } from '../Core/DashFile';
import type { Dash } from '../Dash';
import { Plugin } from './Plugin';
export declare class AllPlugins {
    protected dash: Dash<any>;
    protected plugins: Plugin[];
    constructor(dash: Dash<any>);
    loadPlugins(scriptEnv?: any): Promise<void>;
    getCompilerOptions(): Promise<any>;
    protected getPluginContext(pluginId: string, pluginOpts?: any): Promise<{
        options: any;
        fileSystem: import("../main").FileSystem;
        outputFileSystem: import("../main").FileSystem;
        projectConfig: import("../DashProjectConfig").DashProjectConfig;
        projectRoot: string;
        packType: import("mc-project-core").PackType<any>;
        fileType: import("mc-project-core").FileType<any>;
        targetVersion: string | undefined;
        requestJsonData: <T = any>(dataPath: string) => Promise<T>;
        getAliases: (filePath: string) => string[];
        hasComMojangDirectory: boolean;
        compileFiles: (filePaths: string[]) => Promise<void>;
    }>;
    runBuildStartHooks(): Promise<void>;
    runIncludeHooks(): Promise<(string | [string, {
        isVirtual?: boolean | undefined;
    }])[]>;
    runTransformPathHooks(filePath: string): Promise<string | null>;
    runReadHooks(filePath: string, fileHandle?: {
        getFile: () => Promise<File> | File;
    }): Promise<any>;
    runLoadHooks(filePath: string, readData: any): Promise<any>;
    runRegisterAliasesHooks(filePath: string, data: any): Promise<Set<string>>;
    runRequireHooks(filePath: string, data: any): Promise<Set<string>>;
    runTransformHooks(file: DashFile): Promise<any>;
    runFinalizeBuildHooks(file: DashFile): Promise<string | ArrayBuffer | Blob | undefined>;
    runBuildEndHooks(): Promise<void>;
}
