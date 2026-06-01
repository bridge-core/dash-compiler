import * as esbuild from 'esbuild-wasm';
import { FileSystem } from '../../../main';
export declare function createNodeModuleResolver({ fileSystem, projectRoot, }: {
    fileSystem: FileSystem;
    projectRoot: string;
}): {
    resolveBare: (specifier: string) => Promise<string | undefined>;
    resolveRelative: (importer: string | undefined, requestPath: string) => Promise<string | undefined>;
    readText: (path: string) => Promise<string>;
    loaderFor: (path: string) => esbuild.Loader;
};
