import { AnySelectMenuInteraction, ButtonInteraction, CacheType, ModalSubmitInteraction, RepliableInteraction } from 'discord.js';
import { GuildOnlyCacheType } from './autocompleters';
import { RegisteredClient } from './register';


export const ComponentTypes = ['Button', 'SelectMenu', 'ModalSubmit'] as const;
export type ComponentType = typeof ComponentTypes[number];

export type ComponentInteractions<C extends CacheType = CacheType> = {
  Button: ButtonInteraction<C>;
  SelectMenu: AnySelectMenuInteraction<C>;
  ModalSubmit: ModalSubmitInteraction<C>;
};
export type ComponentInteraction = ComponentInteractions[ComponentType];

export interface ComponentIdleOptions {
  /** How long (in ms) the message can go unused before it is idle. After a restart, it counts from the last edit */
  timeout: number;
  /**
   * Called when the message goes idle, e.g. to run `interaction.editReply({ components: [] })`.
   * It gets the click that found the message idle, or the last click when the timer runs out.
   * If you use `editReply()` here, answer clicks with `update()` or `deferUpdate()` so it edits the right message.
   */
  onIdle: (interaction: RepliableInteraction) => unknown;
}

export interface ComponentOptions<T extends ComponentType = ComponentType, G extends boolean = true> {
  /** The Type(s) of interaction the Component handles */
  type: T | readonly T[];
  /** The Custom Id to match. A string has to match exactly, a RegExp is tested against it */
  customId: string | RegExp;
  /** Whether to only handle interactions in guilds the bot is in (defaults to `true`) */
  guildOnly?: G;
  /** The Cooldown of the Component (in MS). It is per user, and shared by every message the component is on */
  cooldown?: number;
  /** Close the message after it has not been used for a while */
  idle?: ComponentIdleOptions;
  /** Whether the Component is disabled */
  disabled?: boolean;
  /**
   * Handles the execution of the Component
   * @param match The RegExp match when `customId` is a RegExp, otherwise `null`
   */
  execute: (
    client: RegisteredClient, interaction: ComponentInteractions<GuildOnlyCacheType<G>>[T], match: RegExpExecArray | null
  ) => unknown;
}

export interface FrameworkComponent<T extends ComponentType = ComponentType, G extends boolean = boolean> extends Omit<ComponentOptions<T, G>, 'type'> {
  id: string;
  name: string;
  filepath: string;
  /** The Types of interaction the Component handles */
  types: readonly T[];
  disabled: boolean;
  guildOnly: G;
}


export type ComponentEvents = {
  /** Emitted when a component starts running */
  execute: [context: { component: FrameworkComponent; interaction: ComponentInteraction }];
  /** Emitted when a component finishes, with how long it took in ms */
  success: [context: { component: FrameworkComponent; interaction: ComponentInteraction; duration: number }];
  /** Emitted when a component throws */
  error: [context: { component: FrameworkComponent; interaction: ComponentInteraction; error: unknown; duration: number }];
  /** Emitted when no component matches the interaction. A collector may still handle it */
  unknown: [interaction: ComponentInteraction];
};
