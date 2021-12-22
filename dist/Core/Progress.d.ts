export declare class Progress {
    protected total: number;
    protected current: number;
    protected onChangeCbs: Set<(progress: Progress) => void>;
    constructor(total?: number);
    get percentage(): number;
    onChange(cb: (progress: Progress) => void): {
        dispose: () => boolean;
    };
    setTotal(total: number): void;
    updateCurrent(current: number): void;
    advance(): void;
    addToTotal(amount: number): void;
}
