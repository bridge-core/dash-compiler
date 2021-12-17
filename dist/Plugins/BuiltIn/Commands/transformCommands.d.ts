import { Command } from './Command';
export declare function transformCommands(commands: string[], dependencies: Record<string, Command>, includeComments: boolean, nestingDepth?: number): string[];
