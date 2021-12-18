import type { Dash } from '../Dash';
import { DashFile } from './DashFile';
export declare class LoadFiles {
    protected dash: Dash<any>;
    constructor(dash: Dash<any>);
    run(files: DashFile[]): Promise<void>;
    loadFile(file: DashFile, writeFiles?: boolean): Promise<void>;
    loadRequiredFiles(file: DashFile): Promise<void>;
}
