import { Console } from '../../../Common/Console';
export declare class Collection {
    protected console: Console;
    readonly __isCollection = true;
    protected files: Map<string, any>;
    constructor(console: Console);
    get hasFiles(): boolean;
    getAll(): [string, any][];
    get(filePath: string): any;
    clear(): void;
    add(filePath: string, fileContent: any): void;
    has(filePath: string): boolean;
    addFrom(collection: Collection, baseDir?: string): void;
}
