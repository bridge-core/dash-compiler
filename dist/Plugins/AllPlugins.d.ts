import type { DashFile } from '../Core/DashFile';
import type { Dash } from '../Dash';
import { Plugin } from './Plugin';
export declare class AllPlugins {
    protected dash: Dash;
    protected plugins: Plugin[];
    constructor(dash: Dash);
    loadPlugins(scriptEnv?: any): Promise<void>;
    runBuildStartHooks(): Promise<void>;
    runIncludeHooks(): Promise<string[]>;
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
