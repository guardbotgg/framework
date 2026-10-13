import {
  APIApplicationCommandOption, AutocompleteInteraction, CacheType, ChatInputCommandInteraction, CommandInteraction, LocalizationMap, Message,
  MessageContextMenuCommandInteraction, PermissionResolvable, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import { RegisteredClient } from './register';


export const CommandTypes = ['Slash', 'Message', 'ContextMessage', 'ContextUser'] as const;
export const CommandContexts = ['Guild', 'BotDM', 'PrivateChannel', 0, 1, 2] as const;
export const IntegrationTypes = ['GuildInstall', 'UserInstall', 0, 1] as const;
export const CommandScopes = ['default', 'guild', 'global'] as const;
export const MessageCommandContexts = ['Guild', 'BotDM'] as const;

export type CommandType = typeof CommandTypes[number];
export type CommandContext = typeof CommandContexts[number];
export type IntegrationType = typeof IntegrationTypes[number];
export type CommandScope = typeof CommandScopes[number];
export type MessageCommandContext = typeof MessageCommandContexts[number];

export type CommandContextsInput = readonly CommandContext[] | undefined;
export type IntegrationTypesInput = readonly IntegrationType[] | undefined;
export type MessageCommandContextsInput = readonly MessageCommandContext[] | undefined;

export type AppCommandCacheType<C extends CommandContextsInput, I extends IntegrationTypesInput> = (
  OnlyIncludes<C, 'Guild' | 0> extends true
    ? OnlyIncludes<I, 'GuildInstall' | 0> extends true ? 'cached' : CacheType
    : CacheType
);

type OnlyIncludes<T, Allowed> = T extends readonly (infer U)[] ? ([U] extends [Allowed] ? true : false) : true;


export interface BaseCommandOptions {
  /** The Name of the Command */
  name: string;
  /** The Description of the Command */
  description: string;
  /** The Type of the Command */
  commandType: CommandType;
  /** The Cooldown of the Command (in MS) */
  cooldown?: number;
  /** Permissions required by the User to use this Command */
  memberPermissions?: PermissionResolvable;
  /** Permissions required by the Application Client to execute this Command */
  clientPermissions?: PermissionResolvable;
  /** Whether this command is Disabled */
  disabled?: boolean;
  /** The Category of the Command (defaults to its folder name) */
  category?: string;
}

interface BaseAppCommandOptions<C extends CommandContextsInput, I extends IntegrationTypesInput> extends BaseCommandOptions {
  /**
   * Where this Application Command can be registered (defaults to `default`)
   * - `default` - In both Guild & Global Commands
   * - `guild` - In only Guild Commands
   * - `global` - In only Global Commands
   */
  commandScope?: CommandScope;
  /**
   * Where this Application Command can be used (defaults to `['Guild']`)
   * - `Guild` | `(0)` - In Guilds
   * - `BotDM` | `(1)` - In Application DMs
   * - `PrivateChannel` | `(2)` - In Other's DMs & Group DMs
   */
  commandContexts?: C;
  /**
   * Where this Application Command can be integrated (defaults to `['GuildInstall']`)
   * - `GuildInstall` | `(0)` - App is installable to servers
   * - `UserInstall` | `(1)` - App is installable to users
   */
  integrationTypes?: I;
  /** The Name Localizations of the Command */
  nameLocalizations?: LocalizationMap;
  /** The Description Localizations of the Command */
  descriptionLocalizations?: LocalizationMap;
}


type InferMessage<C extends MessageCommandContextsInput> = (C extends readonly MessageCommandContext[]
  ? 'BotDM' extends C[number]
    ? 'Guild' extends C[number] ? Message<boolean> : Message<false>
    : Message<true>
  : Message<true>
);

export interface MessageCommandOptions<C extends MessageCommandContextsInput = MessageCommandContextsInput> extends BaseCommandOptions {
  commandType: 'Message';
  /** The Aliases of the Command */
  aliases?: string[];
  /** The Usage of the Command */
  usage?: string;
  /** Whether the command is Developer Only */
  devOnly?: boolean;
  /**
   * Where this Message Command can be used (defaults to `['Guild']`)
   * - `BotDM` - In Application DMs
   * - `Guild` - In Guilds
   */
  contexts?: C;
  /** Keep `"quoted text"` together as one argument (defaults to `false`) */
  quotedArgs?: boolean;
  execute: (client: RegisteredClient, message: InferMessage<C>, args: string[]) => unknown;
}


export type SlashOptionsInput = (
  | APIApplicationCommandOption[]
  | { toJSON(): APIApplicationCommandOption }[]
  | ((builder: SlashCommandBuilder) => SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder)
);

/** Handles a slash command or one of its subcommands */
export type SlashCommandHandler<C extends CommandContextsInput = CommandContextsInput, I extends IntegrationTypesInput = IntegrationTypesInput> = (
  (client: RegisteredClient, interaction: ChatInputCommandInteraction<AppCommandCacheType<C, I>>) => unknown
);

export interface BaseSlashCommandOptions<C extends CommandContextsInput, I extends IntegrationTypesInput> extends BaseAppCommandOptions<C, I> {
  commandType: 'Slash';
  /** The Application Command Options of this Command */
  options?: SlashOptionsInput;
  autocomplete?: (client: RegisteredClient, interaction: AutocompleteInteraction<AppCommandCacheType<C, I>>) => unknown;
}

/**
 * Use `execute`, `subcommands`, or both
 * - `subcommands` - A handler for each subcommand, e.g. `add`, or `roles add` for one in a group
 * - `execute` - Runs the command, and any subcommand without its own handler
 */
export type SlashCommandHandlers<C extends CommandContextsInput, I extends IntegrationTypesInput> = (
  | { execute: SlashCommandHandler<C, I>; subcommands?: Record<string, SlashCommandHandler<C, I>> }
  | { execute?: SlashCommandHandler<C, I>; subcommands: Record<string, SlashCommandHandler<C, I>> }
);

export type SlashCommandOptions<C extends CommandContextsInput = CommandContextsInput, I extends IntegrationTypesInput = IntegrationTypesInput> = (
  BaseSlashCommandOptions<C, I> & SlashCommandHandlers<C, I>
);


export interface ContextMessageCommandOptions<C extends CommandContextsInput = CommandContextsInput, I extends IntegrationTypesInput = IntegrationTypesInput> extends Omit<BaseAppCommandOptions<C, I>, 'description'> {
  commandType: 'ContextMessage';
  /** The Description of the Command */
  description?: string;
  execute: (client: RegisteredClient, interaction: MessageContextMenuCommandInteraction<AppCommandCacheType<C, I>>) => unknown;
}

export interface ContextUserCommandOptions<C extends CommandContextsInput = CommandContextsInput, I extends IntegrationTypesInput = IntegrationTypesInput> extends Omit<BaseAppCommandOptions<C, I>, 'description'> {
  commandType: 'ContextUser';
  /** The Description of the Command */
  description?: string;
  execute: (client: RegisteredClient, interaction: UserContextMenuCommandInteraction<AppCommandCacheType<C, I>>) => unknown;
}

export type ContextCommandOptions<C extends CommandContextsInput = CommandContextsInput, I extends IntegrationTypesInput = IntegrationTypesInput> = (
  ContextMessageCommandOptions<C, I> | ContextUserCommandOptions<C, I>
);


interface BaseCommandMeta {
  id: string;
  filepath: string;
  disabled: boolean;
}

export type FrameworkSlashCommand<C extends CommandContextsInput = CommandContextsInput, I extends IntegrationTypesInput = IntegrationTypesInput> = (
  SlashCommandOptions<C, I> & BaseCommandMeta & { options: APIApplicationCommandOption[]; commandScope: CommandScope }
);
export type FrameworkMessageCommand<C extends MessageCommandContextsInput = MessageCommandContextsInput> = (
  MessageCommandOptions<C> & BaseCommandMeta & { devOnly: boolean; contexts: readonly MessageCommandContext[]; aliases: string[]; quotedArgs: boolean }
);
export type FrameworkContextCommand<C extends CommandContextsInput = CommandContextsInput, I extends IntegrationTypesInput = IntegrationTypesInput> = (
  ContextCommandOptions<C, I> & BaseCommandMeta & { commandScope: CommandScope }
);
export type FrameworkCommand = (FrameworkSlashCommand | FrameworkMessageCommand | FrameworkContextCommand);
export type FrameworkAppCommand = (FrameworkSlashCommand | FrameworkContextCommand);


/** Stores cooldowns. If it is shared between processes, `acquire` has to be atomic */
export interface CooldownStore {
  /**
   * Starts the user's cooldown, unless they are already on one
   * @param id The command or component id, e.g. `Slash:ping` or `Button:confirm`
   * @returns When the current cooldown ends (in ms) if there is one, otherwise `null`
   */
  acquire(id: string, userId: string, duration: number): Promise<number | null> | number | null;
}


export type CommandEvents = {
  /** Emitted when a command starts running */
  execute: [context: { command: FrameworkCommand; context: Message | CommandInteraction }];
  /** Emitted when a command finishes, with how long it took in ms */
  success: [context: { command: FrameworkCommand; context: Message | CommandInteraction; duration: number }];
  /** Emitted when a command throws */
  error: [context: { command: FrameworkCommand; context: Message | CommandInteraction; error: unknown; duration: number }];
  /** Emitted when no command matches the interaction */
  unknown: [interaction: CommandInteraction];
};
