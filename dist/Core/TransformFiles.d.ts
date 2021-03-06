import { Dash } from '../Dash';
import type { DashFile } from './DashFile';
export declare class FileTransformer {
    protected dash: Dash<any>;
    constructor(dash: Dash<any>);
    run(resolvedFileOrder: Set<DashFile>, skipTransform?: boolean): Promise<void>;
    transformFile(file: DashFile, runFinalizeHook?: boolean, skipTransform?: boolean): Promise<any>;
}
