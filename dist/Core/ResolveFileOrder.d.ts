import { Dash } from '../Dash';
import { DashFile } from './DashFile';
export declare class ResolveFileOrder {
    protected dash: Dash<any>;
    constructor(dash: Dash<any>);
    run(files: DashFile[]): Set<DashFile>;
    resolveSingle(file: DashFile, resolved: Set<DashFile>, unresolved?: Set<DashFile>): void;
}
