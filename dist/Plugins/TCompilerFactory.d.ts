import { TCompilerPlugin } from './TCompilerPlugin';
import { FileSystem } from '../FileSystem/FileSystem';
import { DashProjectConfig } from '../DashProjectConfig';
export declare type TCompilerPluginFactory<T = {
    mode: 'development' | 'production';
    [key: string]: any;
}> = (context: {
    options: T;
    fileSystem: FileSystem;
    outputFileSystem: FileSystem;
    projectConfig: DashProjectConfig;
    projectRoot: string;
    hasComMojangDirectory: boolean;
    compileFiles: (files: string[]) => Promise<void>;
    getAliases: (filePath: string) => string[];
    targetVersion?: string;
}) => Partial<TCompilerPlugin>;
