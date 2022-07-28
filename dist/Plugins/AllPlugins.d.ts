import type { DashFile, IFileHandle } from '../Core/DashFile';
import type { Dash } from '../Dash';
import { Plugin } from './Plugin';
import { JsRuntime } from '../Common/JsRuntime';
export declare class AllPlugins {
    protected dash: Dash<any>;
    protected plugins: Plugin[];
    protected pluginRuntime: JsRuntime;
    constructor(dash: Dash<any>);
    loadPlugins(scriptEnv?: any): Promise<void>;
    getCompilerOptions(): Promise<any>;
    protected getPluginContext(pluginId: string, pluginOpts?: any): Promise<{
        options: any;
        jsRuntime: JsRuntime;
        console: import("../main").Console;
        fileSystem: import("../main").FileSystem;
        outputFileSystem: import("../main").FileSystem;
        projectConfig: import("../DashProjectConfig").DashProjectConfig;
        projectRoot: string;
        packType: import("mc-project-core").PackType<any>;
        fileType: import("mc-project-core").FileType<any>;
        targetVersion: string | undefined;
        requestJsonData: <T = any>(dataPath: string) => Promise<T>;
        getAliases: (filePath: string) => string[];
        getFileMetadata: (filePath: string) => {
            get(key: string): any;
            set(key: string, value: any): void;
            delete(key: string): void;
        };
        addFileDependencies: (filePath: string, filePaths: string[], clearPrevious?: boolean) => void;
        getOutputPath: (filePath: string) => Promise<string | undefined>;
        unlinkOutputFiles: (filePaths: string[]) => Promise<void>;
        hasComMojangDirectory: boolean;
        compileFiles: (filePaths: string[], virtual?: boolean) => Promise<void>;
    }>;
    runBuildStartHooks(): Promise<void>;
    runIncludeHooks(): Promise<(string | [string, {
        isVirtual?: boolean | undefined;
    }])[]>;
    runTransformPathHooks(filePath: string): Promise<string | null>;
    runReadHooks(filePath: string, fileHandle?: IFileHandle): Promise<any>;
    runLoadHooks(filePath: string, readData: any): Promise<any>;
    runRegisterAliasesHooks(filePath: string, data: any): Promise<Set<string>>;
    runRequireHooks(filePath: string, data: any): Promise<Set<string>>;
    runTransformHooks(file: DashFile): Promise<any>;
    runFinalizeBuildHooks(file: DashFile): Promise<string | ArrayBuffer | Blob | null | undefined>;
    runBuildEndHooks(): Promise<void>;
    runBeforeFileUnlinked(filePath: string): Promise<void>;
}
