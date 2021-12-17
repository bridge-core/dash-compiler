import { TCompilerPlugin } from './TCompilerPlugin';
import { FileSystem } from '../FileSystem/FileSystem';
import { DashProjectConfig } from '../DashProjectConfig';
import { FileType, PackType } from 'mc-project-core';
export declare type TCompilerPluginFactory<T = {
    mode: 'development' | 'production';
    [key: string]: any;
}> = (context: {
    options: T;
    fileSystem: FileSystem;
    outputFileSystem: FileSystem;
    projectConfig: DashProjectConfig;
    packType: PackType<any>;
    fileType: FileType<any>;
    projectRoot: string;
    hasComMojangDirectory: boolean;
    compileFiles: (files: string[]) => Promise<void>;
    getAliases: (filePath: string) => string[];
    targetVersion?: string;
}) => Partial<TCompilerPlugin>;
