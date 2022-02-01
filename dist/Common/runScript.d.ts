import { Console } from './Console';
export interface IScriptContext {
    script: string;
    env: Record<string, unknown>;
    async?: boolean;
    modules?: Record<string, unknown>;
    console: Console;
}
export declare function run(context: IScriptContext): any;
export declare function createRunner({ script, env, modules, async, console, }: IScriptContext): Function;
export declare function transformScript(script: string): string;
