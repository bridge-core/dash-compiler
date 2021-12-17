import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
export declare const CustomCommandsPlugin: TCompilerPluginFactory<{
    include: Record<string, string[]>;
    isFileRequest: boolean;
    mode: 'dev' | 'build';
    v1CompatMode?: boolean;
}>;
