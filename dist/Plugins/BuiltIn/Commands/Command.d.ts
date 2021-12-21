export declare type TTemplate = (commandArgs: unknown[], opts: any) => string | string[];
export declare class Command {
    protected commandSrc: string;
    protected mode: 'development' | 'production';
    protected v1Compat: boolean;
    protected _name?: string;
    protected schema?: any;
    protected template?: TTemplate;
    constructor(commandSrc: string, mode: 'development' | 'production', v1Compat: boolean);
    get name(): string;
    load(type?: 'client' | 'server'): Promise<void>;
    process(command: string, dependencies: Record<string, Command>, nestingDepth: number): string[];
    getSchema(): any[];
    toString(): string;
}
