import { Dash } from '../Dash';
import { DashFile } from './DashFile';
export declare class ResolveFileOrder {
    protected dash: Dash;
    constructor(dash: Dash);
    run(): Set<DashFile>;
    protected resolve(file: DashFile, resolved: Set<DashFile>, unresolved: Set<DashFile>): void;
}
