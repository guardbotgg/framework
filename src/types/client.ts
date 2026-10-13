import { ClientOptions } from 'discord.js';
import { CooldownStore } from './commands';
import { FrameworkHooks } from './hooks';


export interface RegisterCommandsOptions {
  /** Guild ids to register guild commands to */
  guilds?: string[];
  /** Whether to register global commands */
  global?: boolean;
}

export interface FrameworkClientOptions {
  /** The discord.js client options */
  clientOptions: ClientOptions;
  /** The folder that holds your commands, listeners etc. Usually `__dirname` or `import.meta.dirname` */
  rootDir: string;
  /** The commands folder, relative to `rootDir` (defaults to `commands`) */
  commandsDir?: string;
  /** The listeners folder, relative to `rootDir` (defaults to `listeners`) */
  listenersDir?: string;
  /** The autocompleters folder, relative to `rootDir` (defaults to `autocompleters`) */
  autocompletersDir?: string;
  /** The components folder, relative to `rootDir` (defaults to `components`) */
  componentsDir?: string;
  /** The extensions folder, relative to `rootDir` (defaults to `extensions`) */
  extensionsDir?: string;
  /** User ids that can use `devOnly` commands */
  developers?: readonly string[];
  /** The prefix for message commands (defaults to `!`) */
  prefix?: string;
  /** Register application commands when the client is ready */
  registerCommands?: RegisterCommandsOptions;
  /** Where cooldowns are saved (defaults to memory) */
  cooldownStore?: CooldownStore;
  /** Middleware and custom replies */
  hooks?: FrameworkHooks;
  /** Reload files when they change. Only meant for development */
  watch?: boolean;
}
