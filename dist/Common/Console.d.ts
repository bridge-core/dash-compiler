export declare abstract class Console {
    protected verboseLogs: boolean;
    protected _timers: Map<string, number>;
    constructor(verboseLogs?: boolean);
    abstract log(...args: any[]): void;
    abstract error(...args: any[]): void;
    abstract warn(...args: any[]): void;
    abstract info(...args: any[]): void;
    time(timerName: string): void;
    timeEnd(timerName: string): void;
}
