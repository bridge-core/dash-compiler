import { TCompilerPluginFactory } from '../TCompilerPluginFactory';
export declare const SimpleRewrite: TCompilerPluginFactory<{
    buildName?: string;
    packName?: string;
    rewriteToComMojang?: boolean;
    packNameSuffix?: Record<string, string>;
}>;
