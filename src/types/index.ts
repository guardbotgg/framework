import { ClientOptions } from 'discord.js';

export * from './commands';
export * from './listeners';
export * from './autocompleters';
export * from './discord';


export interface FrameworkClientOptions {
  clientOptions: ClientOptions;
  developers?: readonly string[];
  prefix?: string;
  registerOnStart?: boolean;
  guildsToRegister?: string[];
  rootDir?: string;
  commandsDir?: string;
  listenersDir?: string;
  autocompletersDir?: string;
}