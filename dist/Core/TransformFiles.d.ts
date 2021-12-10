import { Dash } from '../Dash';
import type { DashFile } from './DashFile';
export declare class FileTransformer {
    protected dash: Dash;
    constructor(dash: Dash);
    run(resolvedFileOrder: Set<DashFile>): Promise<void>;
}
