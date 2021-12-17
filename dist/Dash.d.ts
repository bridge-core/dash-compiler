import { FileSystem } from './FileSystem/FileSystem';
import { DashProjectConfig } from './DashProjectConfig';
import { AllPlugins } from './Plugins/AllPlugins';
import { IncludedFiles } from './Core/IncludedFiles';
import { LoadFiles } from './Core/LoadFiles';
import { ResolveFileOrder } from './Core/ResolveFileOrder';
import { FileTransformer } from './Core/TransformFiles';
import { FileType, PackType } from 'mc-project-core';
export interface IDashOptions<TSetupArg = void> {
    mode?: 'development' | 'production';
    config: string;
    pluginEnvironment?: any;
    packType: PackType<TSetupArg>;
    fileType: FileType<TSetupArg>;
}
export declare class Dash<TSetupArg = void> {
    readonly fileSystem: FileSystem;
    protected options: IDashOptions<TSetupArg>;
    readonly outputFileSystem: FileSystem;
    readonly projectConfig: DashProjectConfig;
    readonly projectRoot: string;
    readonly plugins: AllPlugins;
    packType: PackType<any>;
    fileType: FileType<any>;
    includedFiles: IncludedFiles;
    loadFiles: LoadFiles;
    fileOrderResolver: ResolveFileOrder;
    fileTransformer: FileTransformer;
    constructor(fileSystem: FileSystem, outputFileSystem: FileSystem | undefined, options: IDashOptions<TSetupArg>);
    getMode(): "development" | "production";
    setup(setupArg: TSetupArg): Promise<void>;
    get isCompilerActivated(): boolean;
    build(): Promise<void>;
    protected compileIncludedFiles(): Promise<void>;
    compileVirtualFiles(filePaths: string[]): Promise<void>;
    updateFiles(filePaths: string[]): Promise<void>;
    unlink(path: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    watch(): void;
}
