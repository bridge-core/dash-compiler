import { ProjectConfig } from 'mc-project-core';
import { FileSystem } from './FileSystem/FileSystem';
export declare class DashProjectConfig extends ProjectConfig {
    protected fileSystem: FileSystem;
    protected configPath: string;
    constructor(fileSystem: FileSystem, configPath: string);
    readConfig(): Promise<any>;
    writeConfig(configJson: any): Promise<void>;
}
