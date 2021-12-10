import { FileSystem } from './FileSystem/FileSystem';
import { DashProjectConfig } from './DashProjectConfig';
import { AllPlugins } from './Plugins/AllPlugins';
import { IncludedFiles } from './Core/IncludedFiles';
import { LoadFiles } from './Core/LoadFiles';
import { ResolveFileOrder } from './Core/ResolveFileOrder';
import { FileTransformer } from './Core/TransformFiles';
import { PackType } from 'mc-project-core';
export interface IDashOptions {
    mode?: 'development' | 'production';
    config: string;
    pluginEnvironment?: any;
    packType?: PackType<any>;
}
export declare class Dash {
    readonly fileSystem: FileSystem;
    readonly outputFileSystem: FileSystem;
    protected options: IDashOptions;
    readonly projectConfig: DashProjectConfig;
    readonly projectRoot: string;
    readonly plugins: AllPlugins;
    includedFiles: IncludedFiles;
    loadFiles: LoadFiles;
    fileOrderResolver: ResolveFileOrder;
    fileTransformer: FileTransformer;
    constructor(fileSystem: FileSystem, outputFileSystem?: FileSystem, options?: IDashOptions);
    getMode(): "development" | "production" | undefined;
    setup(): Promise<void>;
    get isCompilerActivated(): boolean;
    build(): Promise<void>;
    compileVirtualFiles(filePaths: string[]): Promise<void>;
    updateFiles(filePaths: string[]): Promise<void>;
    unlink(path: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    watch(): void;
}
