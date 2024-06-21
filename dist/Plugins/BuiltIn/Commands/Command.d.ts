import { Console } from '../../../Common/Console';
import { Runtime } from '@bridge-editor/js-runtime';
export type TTemplate = (commandArgs: unknown[], opts: any) => string | string[];
export declare class Command {
    protected console: Console;
    protected commandSrc: string;
    protected mode: 'development' | 'production';
    protected v1Compat: boolean;
    protected _name?: string;
    protected schema?: any;
    protected template?: TTemplate;
    constructor(console: Console, commandSrc: string, mode: 'development' | 'production', v1Compat: boolean);
    get name(): string;
    load(jsRuntime: Runtime, filePath: string, type?: 'client' | 'server'): Promise<false | null | undefined>;
    process(command: string, dependencies: Record<string, Command>, nestingDepth: number): string[];
    getSchema(): any[];
    toString(): string;
}
