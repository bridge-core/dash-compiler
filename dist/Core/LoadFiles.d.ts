import type { Dash } from '../Dash';
export declare class LoadFiles {
    protected dash: Dash;
    constructor(dash: Dash);
    run(): Promise<void>;
}
