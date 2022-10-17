import type { Dash } from '../Dash';
import { DashFile } from './DashFile';
export declare class LoadFiles {
    protected dash: Dash<any>;
    copyFilePromises: Promise<void>[];
    constructor(dash: Dash<any>);
    run(files: DashFile[], writeFiles?: boolean): Promise<void>;
    loadFile(file: DashFile, writeFiles?: boolean): Promise<void>;
    awaitAllFilesCopied(): Promise<void>;
}
