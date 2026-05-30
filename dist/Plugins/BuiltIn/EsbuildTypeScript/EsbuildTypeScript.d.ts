import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
export declare const EsbuildTypeScriptPlugin: TCompilerPluginFactory<{
    bundle?: boolean;
    entryFile?: string;
    outfile?: string;
    outdir?: string;
    splitting?: boolean;
}>;
