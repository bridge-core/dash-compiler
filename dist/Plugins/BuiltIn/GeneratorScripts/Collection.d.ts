import { Console } from '../../../Common/Console';
export declare class Collection {
    protected console: Console;
    protected files: Map<string, any>;
    constructor(console: Console);
    get hasFiles(): boolean;
    getAll(): [string, any][];
    get(filePath: string): any;
    clear(): void;
    add(filePath: string, fileContent: any): void;
    addFrom(collection: Collection): void;
}
