import { TCompilerPluginFactory } from '../TCompilerPluginFactory';
export declare const RewriteForPackaging: TCompilerPluginFactory<{
    format?: 'mcaddon' | 'mcworld' | 'mctemplate';
    packName?: string;
}>;
