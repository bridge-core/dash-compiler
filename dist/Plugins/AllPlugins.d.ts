import type { Dash } from '../Dash';
import { Plugin } from './Plugin';
export declare class AllPlugins {
    protected dash: Dash;
    protected plugins: Plugin[];
    constructor(dash: Dash);
    loadPlugins(plugins: Record<string, string>): void;
    runBuildStartHooks(): Promise<void>;
    runIncludeHooks(): Promise<string[]>;
    runTransformPathHooks(filePath: string): Promise<null | undefined>;
    runBuildEndHooks(): Promise<void>;
}
