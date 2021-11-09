import { FileSystem } from './FileSystem/FileSystem';
import { DashProjectConfig } from './DashProjectConfig';
import { AllPlugins } from './Plugins/AllPlugins';
import { IncludedFiles } from './Core/IncludedFiles';
export interface IDashOptions {
    mode: 'development' | 'production';
    config: string;
    output: string;
    plugins: Record<string, string>;
}
export declare class Dash {
    readonly fileSystem: FileSystem;
    protected options: IDashOptions;
    readonly projectConfig: DashProjectConfig;
    readonly projectRoot: string;
    readonly plugins: AllPlugins;
    includedFiles: IncludedFiles;
    constructor(fileSystem: FileSystem, options: IDashOptions);
    build(): Promise<void>;
    watch(): void;
}
