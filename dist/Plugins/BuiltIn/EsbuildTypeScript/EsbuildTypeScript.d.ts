import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
export declare const EsbuildTypeScriptPlugin: TCompilerPluginFactory<{
    bundle?: boolean;
    entryFile?: string;
    entryPoints?: string[];
    outFile?: string;
    outDir?: string;
    splitting?: boolean;
    externals?: string[];
    sourcemap?: boolean | 'linked' | 'external' | 'inline' | 'both';
    sourceRoot?: string;
    useBPAsSourceRoot?: boolean;
    dropLabels?: string[];
    define?: {
        [key: string]: string;
    };
    keepNames?: boolean;
}>;
