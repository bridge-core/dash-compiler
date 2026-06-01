import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
export declare const EsbuildTypeScriptPlugin: TCompilerPluginFactory<{
    bundle?: boolean;
    entryFile?: string;
    entryPoints?: string[];
    outfile?: string;
    outdir?: string;
    splitting?: boolean;
    format?: 'esm' | 'cjs' | 'iife';
    externals?: string[];
}>;
