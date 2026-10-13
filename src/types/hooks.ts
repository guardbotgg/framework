import { CommandInteraction, Message, PermissionsString, RepliableInteraction } from 'discord.js';
import { FrameworkCommand, FrameworkMessageCommand } from './commands';
import { FrameworkComponent } from './components';


export type Middleware = (context: Message | RepliableInteraction, source: FrameworkCommand | FrameworkComponent) => Promise<boolean> | boolean;

export interface FrameworkHooks {
  /** Runs in order before every command and component. Return `false` to stop it */
  middleware?: Middleware[];
  /** Replaces the default reply when a user is on cooldown */
  onCooldown?: (context: Message | RepliableInteraction, source: FrameworkCommand | FrameworkComponent, expiresAt: Date) => unknown;
  /** Replaces the default reply when a user is missing `memberPermissions` on a message command */
  onMemberPermissions?: (context: Message, command: FrameworkMessageCommand, missingPermissions: PermissionsString[]) => unknown;
  /** Replaces the default reply when the bot is missing `clientPermissions` */
  onClientPermissions?: (context: Message | CommandInteraction, command: FrameworkCommand, missingPermissions: PermissionsString[]) => unknown;
  /** Replaces the default reply when a guild only command or component is used outside the bot's guilds */
  onGuildOnly?: (interaction: RepliableInteraction, source: FrameworkCommand | FrameworkComponent) => unknown;
  /** Replaces the default reply when a command or component throws. The module still emits `error` */
  onError?: (context: Message | RepliableInteraction, error: unknown, source: FrameworkCommand | FrameworkComponent) => unknown;
}
