import { TCompilerPluginFactory } from '../../TCompilerPluginFactory';
interface IOpts {
    fileType: string;
    getComponentObjects: (fileContent: any) => [string, any][];
}
export declare function createCustomComponentPlugin({ fileType, getComponentObjects, }: IOpts): TCompilerPluginFactory<{
    isFileRequest: boolean;
    mode: 'development' | 'production';
    v1CompatMode?: boolean;
}>;
export declare const CustomEntityComponentPlugin: TCompilerPluginFactory<{
    isFileRequest: boolean;
    mode: 'development' | 'production';
    v1CompatMode?: boolean | undefined;
}>;
export declare const CustomItemComponentPlugin: TCompilerPluginFactory<{
    isFileRequest: boolean;
    mode: 'development' | 'production';
    v1CompatMode?: boolean | undefined;
}>;
export declare const CustomBlockComponentPlugin: TCompilerPluginFactory<{
    isFileRequest: boolean;
    mode: 'development' | 'production';
    v1CompatMode?: boolean | undefined;
}>;
export {};
