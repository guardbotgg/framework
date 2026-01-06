import { ApplicationCommandOptionData, ApplicationIntegrationType, AutocompleteInteraction, ChatInputCommandInteraction, CommandInteraction, ContextMenuCommandInteraction, Interaction, InteractionContextType, LocalizationMap, Message, PermissionResolvable, PermissionsString, ToAPIApplicationCommandOptions } from 'discord.js';
import FrameworkClient from '../FrameworkClient';


interface BaseCommandOptions {
  /** The Name of the Command */
  name: string;
  /** The Description of the Command */
  description: string;
  /** The Type of the Command */
  commandType: 'Slash' | 'Message' | 'ContextMessage' | 'ContextUser';
  /** The Cooldown of the Command (in MS) */
  cooldown?: number;
  /** Permissions required by the User to use this Command */
  memberPermissions?: PermissionResolvable;
  /** Permissions required by the Application Client to execute this Command */
  clientPermissions?: PermissionResolvable;
  /** Whether this command is Disbaled */
  disabled?: boolean;
}

interface BaseAppCommandOptions extends BaseCommandOptions {
  /**
   * Where this Application Command can be registered
   * - `default` - In both Guild & Global Commands
   * - `guild` - In only Guild Commands
   * - `global` - In only Global Commands
   */
  commandScope: 'default' | 'guild' | 'global'; 
  /**
   * Where this Application Command can be used
   * - `Guild` | `(0)` - In Guilds
   * - `BotDM` | `(1)` - In Application DMs
   * - `PrivateChannel` | `(2)` - In Other's DMs & Group DMs
   */
  commandContexts?: (InteractionContextType | keyof typeof InteractionContextType)[];
  /**
   * Where this Application Command can be integrated
   * - `GuildInstall` | `(0)` - App is installable to servers
   * - `UserInstall` | `(1)` - App is installable to users
   */
  integrationTypes?: (ApplicationIntegrationType | keyof typeof ApplicationIntegrationType)[];
  /** The Name Localizations of the Command */
  nameLocalizations?: LocalizationMap;
  /** The Description Localizations of the Command */
  descriptionLocalizations?: LocalizationMap;
}


interface MessageCommandOptions extends BaseCommandOptions {
  commandType: 'Message';
  /** The Aliases of the Command */
  aliases?: string[];
  /** The Usage of the Command */
  usage?: string;
  /** Whether the command is Developer Only */
  devOnly?: boolean;
  /** 
   * Where this Application Command can be used
   * - `BotDM` - In Application DMs
   * - `Guild` - In Guilds
   */
  contexts?: ('BotDM' | 'Guild')[];
  execute: (client: FrameworkClient<true>, message: Message, args: string[]) => Promise<unknown>;
}

interface SlashCommandOptions extends BaseAppCommandOptions {
  commandType: 'Slash';
  /** The Application Command Options of this Command */
  options?: (ApplicationCommandOptionData | ToAPIApplicationCommandOptions)[];
  execute: (client: FrameworkClient<true>, interaction: ChatInputCommandInteraction) => Promise<unknown>;
  autocomplete?: (client: FrameworkClient<true>, interaction: AutocompleteInteraction) => Promise<unknown>;
}

interface ContextCommandOptions extends BaseAppCommandOptions {
  commandType: 'ContextMessage' | 'ContextUser';
  execute: (client: FrameworkClient<true>, interaction: ContextMenuCommandInteraction) => Promise<unknown>;
}

interface BaseCommand {
  id: string;
  filepath: string;
  disabled: boolean;
}


type FrameworkSlashCommand = SlashCommandOptions & BaseCommand;
type FrameworkContextCommand = ContextCommandOptions & BaseCommand;
type FrameworkMessageCommand = MessageCommandOptions & BaseCommand & {
  devOnly: boolean;
  contexts: ('BotDM' | 'Guild')[];
}
type FrameworkCommand = (FrameworkSlashCommand | FrameworkMessageCommand | FrameworkContextCommand);


interface CommandModuleHandler {
  onCooldown?: (context: Message|CommandInteraction, command: FrameworkCommand, expirationTime: Date) => any;
  onMemberPermissions?: (context: Message, command: FrameworkCommand, missingPermissions: PermissionsString[]) => any;
  onClientPermissions?: (context: Message|CommandInteraction, command: FrameworkCommand, missingPermissions: PermissionsString[]) => any;
  MessageCommandInterceptor?: (message: Message) => Promise<boolean>;
  InteractionCommandInterceptor?: (interaction: Interaction) => Promise<boolean>;
}
type CommandHandlerName = keyof Omit<CommandModuleHandler, 'MessageCommandInterceptor'|'InteractionCommandInterceptor'>;


export {
  FrameworkCommand,
  FrameworkSlashCommand,
  FrameworkMessageCommand,
  FrameworkContextCommand,
  SlashCommandOptions,
  MessageCommandOptions,
  ContextCommandOptions,
  BaseCommandOptions,
  CommandModuleHandler,
  CommandHandlerName,
}