import { Plugin } from './Plugin';
export declare class AllPlugins {
    protected plugins: Plugin[];
    runBuildStartHooks(): Promise<void>;
    runIncludeHooks(): Promise<string[]>;
    runTransformPathHooks(filePath: string): Promise<null | undefined>;
    runBuildEndHooks(): Promise<void>;
}
