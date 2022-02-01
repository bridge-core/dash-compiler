export declare abstract class Console {
    protected _timers: Map<string, number>;
    abstract log(...args: any[]): void;
    abstract error(...args: any[]): void;
    abstract warn(...args: any[]): void;
    abstract info(...args: any[]): void;
    time(timerName: string): void;
    timeEnd(timerName: string): void;
}
