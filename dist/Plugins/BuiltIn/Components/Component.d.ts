import { ProjectConfig } from 'mc-project-core';
export declare type TTemplate = (componentArgs: any, opts: any) => any;
export declare class Component {
    protected fileType: string;
    protected componentSrc: string;
    protected mode: 'build' | 'dev';
    protected v1Compat: boolean;
    protected targetVersion?: string | undefined;
    protected _name?: string;
    protected schema?: any;
    protected template?: TTemplate;
    protected animations: [any, string | false | undefined][];
    protected animationControllers: [any, string | false | undefined][];
    protected createOnPlayer: [string, any, any][];
    protected dialogueScenes: any[];
    protected clientFiles: Record<string, any>;
    protected projectConfig?: ProjectConfig;
    constructor(fileType: string, componentSrc: string, mode: 'build' | 'dev', v1Compat: boolean, targetVersion?: string | undefined);
    setProjectConfig(projectConfig: ProjectConfig): void;
    get name(): string | undefined;
    load(type?: 'server' | 'client'): Promise<boolean>;
    reset(): void;
    getSchema(): any;
    toString(): string;
    create(fileContent: any, template: any, location?: string, operation?: (deepMerge: (oldData: any, newData: any) => any, oldData: any, newData: any) => any): void;
    protected getObjAtLocation(fileContent: any, location: string[]): any;
    processTemplates(fileContent: any, componentArgs: any, location: string): Promise<void>;
    processAdditionalFiles(fileContent: any): Promise<{
        [x: string]: string | undefined;
    }>;
    protected createAnimations(fileName: string, fileContent: any): string | undefined;
    protected createAnimationControllers(fileName: string, fileContent: any): string | undefined;
    protected getAnimName(prefix: string, fileName: string, id: number): string;
    protected getShortAnimName(category: string, fileName: string, id: number): string;
    protected registerLifecycleHook(fileContent: any, location: string, eventResponse: any, permutationEventName: string, type: 'activated' | 'deactivated'): void;
    protected addEventReponse(event: any, eventResponse: any): void;
    protected findComponentGroupReferences(events: any, type: 'add' | 'remove', componentGroupName: string): any[];
}