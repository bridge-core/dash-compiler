import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
export declare const EsbuildTypeScriptPlugin: TCompilerPluginFactory<{
    bundle?: boolean;
    entryFile?: string;
    entryPoints?: string[];
    outFile?: string;
    outDir?: string;
    splitting?: boolean;
    externals?: string[];
    sourceRoot?: string;
    useBPAsSourceRoot?: boolean;
}>;
