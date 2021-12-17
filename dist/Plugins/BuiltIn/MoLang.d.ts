import { TCompilerPluginFactory } from '../TCompilerPluginFactory';
export declare const MoLangPlugin: TCompilerPluginFactory<{
    include: Record<string, string[]>;
    isFileRequest?: boolean;
    mode: 'build' | 'dev';
}>;
