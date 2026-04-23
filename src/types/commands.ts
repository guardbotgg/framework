import { 
  APIApplicationCommandOption, AutocompleteInteraction, ChatInputCommandInteraction, CommandInteraction, LocalizationMap, Message, 
  MessageContextMenuCommandInteraction, PermissionResolvable, PermissionsString, SlashCommandOptionsOnlyBuilder, UserContextMenuCommandInteraction,
} from 'discord.js';
import { FrameworkClient } from '../core/FrameworkClient';


export const CommandTypes = ['Slash', 'Message', 'ContextMessage', 'ContextUser'] as const;
export const CommandContexts = ['Guild', 'BotDM', 'PrivateChannel', 0, 1, 2] as const;
export const IntegrationTypes = ['GuildInstall', 'UserInstall', 0, 1] as const;
export const CommandScopes = ['default', 'guild', 'global'] as const;
export const MessageCommandContexts = ['Guild', 'BotDM'] as const;

export type CommandType = typeof CommandTypes[number];
export type CommandContext = typeof CommandContexts[number];
export type IntegrationType = typeof IntegrationTypes[number];
export type CommandScope = typeof CommandScopes[number];

type Result = unknown | void;
type MessageCommandContext = typeof MessageCommandContexts[number];


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
}

interface BaseAppCommandOptions extends BaseCommandOptions {
  /**
   * Where this Application Command can be registered
   * - `default` - In both Guild & Global Commands
   * - `guild` - In only Guild Commands
   * - `global` - In only Global Commands
   */
  commandScope: CommandScope;
  /**
   * Where this Application Command can be used
   * - `Guild` | `(0)` - In Guilds
   * - `BotDM` | `(1)` - In Application DMs
   * - `PrivateChannel` | `(2)` - In Other's DMs & Group DMs
   */
  commandContexts?: CommandContext[];
  /**
   * Where this Application Command can be integrated
   * - `GuildInstall` | `(0)` - App is installable to servers
   * - `UserInstall` | `(1)` - App is installable to users
   */
  integrationTypes?: IntegrationType[];
  /** The Name Localizations of the Command */
  nameLocalizations?: LocalizationMap;
  /** The Description Localizations of the Command */
  descriptionLocalizations?: LocalizationMap;
}


type InferMessage<C> = (C extends MessageCommandContext[]
  ? 'Guild' extends C[number] 
    ? 'BotDM' extends C[number] 
      ? Message<boolean> : Message<true>
    : Message<false>
  : Message<boolean>
);

export interface MessageCommandOptions<C extends MessageCommandContext[] | undefined = ['Guild']> extends BaseCommandOptions {
  commandType: 'Message';
  /** The Aliases of the Command */
  aliases?: string[];
  /** The Usage of the Command */
  usage?: string;
  /** Whether the command is Developer Only */
  devOnly?: boolean;
  /**
   * Where this Message Command can be used
   * - `BotDM` - In Application DMs
   * - `Guild` - In Guilds
   */
  contexts?: C;
  execute: (client: FrameworkClient<true>, message: InferMessage<C>, args: string[]) => Promise<Result> | Result;
}


export type SlashOptionsInput = (
  | APIApplicationCommandOption[]
  | { toJSON(): APIApplicationCommandOption }[]
  | ((builder: SlashCommandOptionsOnlyBuilder) => SlashCommandOptionsOnlyBuilder)
);

export interface SlashCommandOptions extends BaseAppCommandOptions {
  commandType: 'Slash';
  /** The Application Command Options of this Command */
  options?: SlashOptionsInput;
  execute: (client: FrameworkClient<true>, interaction: ChatInputCommandInteraction<'cached'>) => Promise<Result> | Result;
  autocomplete?: (client: FrameworkClient<true>, interaction: AutocompleteInteraction<'cached'>) => Promise<Result> | Result;
}


export interface ContextMessageCommandOptions extends Omit<BaseAppCommandOptions, 'description'> {
  commandType: 'ContextMessage';
  /** The Description of the Command */
  description?: string;
  execute: (client: FrameworkClient<true>, interaction: MessageContextMenuCommandInteraction<'cached'>) => Promise<Result> | Result;
}

export interface ContextUserCommandOptions extends Omit<BaseAppCommandOptions, 'description'> {
  commandType: 'ContextUser';
  /** The Description of the Command */
  description?: string;
  execute: (client: FrameworkClient<true>, interaction: UserContextMenuCommandInteraction<'cached'>) => Promise<Result> | Result;
}
export type ContextCommandOptions = (ContextMessageCommandOptions | ContextUserCommandOptions);


interface BaseCommandMeta {
  id: string;
  filepath: string;
  disabled: boolean;
}

export type FrameworkSlashCommand = SlashCommandOptions & BaseCommandMeta & {
  options: APIApplicationCommandOption[];
};
export type FrameworkMessageCommand = MessageCommandOptions & BaseCommandMeta & {
  devOnly: boolean;
  contexts: MessageCommandContext[];
};
export type FrameworkContextCommand = ContextCommandOptions & BaseCommandMeta;
export type FrameworkCommand = (FrameworkSlashCommand | FrameworkMessageCommand | FrameworkContextCommand);


export type CommandMiddleware = (context: Message | CommandInteraction, command: FrameworkCommand) => Promise<boolean> | boolean;
export interface CommandCustomHandlers {
  onCooldown?: (context: Message | CommandInteraction, command: FrameworkCommand, expirationTime: Date) => any;
  onMemberPermissions?: (context: Message, command: FrameworkCommand, missingPermissions: PermissionsString[]) => any;
  onClientPermissions?: (context: Message | CommandInteraction, command: FrameworkCommand, missingPermissions: PermissionsString[]) => any;
}


export interface CommandEvents {
  /** Fired when a command starts execution */
  execute: (context: { command: FrameworkCommand; context: Message | CommandInteraction }) => void;
  /** Fired when a command finishes successfully */
  success: (context: { command: FrameworkCommand; context: Message | CommandInteraction }) => void;
  /** Fired when a command throws an error */
  error: (context: { command: FrameworkCommand; context: Message | CommandInteraction; error: unknown }) => void;
  /** Fired when no matching command is found */
  unknown: (interaction: CommandInteraction) => void;
}