import type { Dash } from '../Dash';
export declare class LoadFiles {
    protected dash: Dash<any>;
    constructor(dash: Dash<any>);
    run(): Promise<void>;
}
