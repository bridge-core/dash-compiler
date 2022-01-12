import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
interface IOpts {
    fileType: string;
    getComponentObjects: (fileContent: any) => [string, any][];
}
export declare function createCustomComponentPlugin({ fileType, getComponentObjects, }: IOpts): TCompilerPluginFactory<{
    v1CompatMode?: boolean;
}>;
export declare const CustomEntityComponentPlugin: TCompilerPluginFactory<{
    v1CompatMode?: boolean | undefined;
}>;
export declare const CustomItemComponentPlugin: TCompilerPluginFactory<{
    v1CompatMode?: boolean | undefined;
}>;
export declare const CustomBlockComponentPlugin: TCompilerPluginFactory<{
    v1CompatMode?: boolean | undefined;
}>;
export {};
