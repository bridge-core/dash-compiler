import { Console } from './Console';
export declare class DefaultConsole extends Console {
    constructor(verboseLogs?: boolean);
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
}
