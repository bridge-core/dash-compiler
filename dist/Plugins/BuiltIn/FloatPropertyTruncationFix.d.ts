import { TCompilerPluginFactory } from '../TCompilerPluginFactory';
export declare function jsonStringifyWithFloatFix(json: Object, matches: {
    pathGlob: string;
    apply?: (path: string, traversedObjects: any[]) => boolean;
}[]): string;
export declare const FloatPropertyTruncationFix: TCompilerPluginFactory;
