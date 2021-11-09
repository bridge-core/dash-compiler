export declare type TCompilerPlugin = {
    buildStart(): Promise<void> | void;
    include(): Maybe<string[]>;
    transformPath(filePath: string | null): Maybe<string>;
    read(filePath: string, fileHandle?: {
        getFile(): Promise<File> | File;
    }): Promise<any> | any;
    load(filePath: string, fileContent: any): Promise<any> | any;
    registerAliases(source: string, fileContent: any): Maybe<string[]>;
    require(source: string, fileContent: any): Maybe<string[]>;
    transform(filePath: string, fileContent: any, dependencies?: Record<string, any>): Promise<any> | any;
    finalizeBuild(filePath: string, fileContent: any): Maybe<string | Uint8Array | ArrayBuffer | Blob>;
    buildEnd(): Promise<void> | void;
};
