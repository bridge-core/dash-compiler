import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
export declare const CustomCommandsPlugin: TCompilerPluginFactory<{
    include: Record<string, string[]>;
    isFileRequest: boolean;
    mode: 'development' | 'production';
    v1CompatMode?: boolean;
}>;
