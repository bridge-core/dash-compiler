import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
export declare const CustomCommandsPlugin: TCompilerPluginFactory<{
    include: Record<string, string[]>;
    v1CompatMode?: boolean;
}>;
