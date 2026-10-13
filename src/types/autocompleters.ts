import { AutocompleteInteraction, CacheType } from 'discord.js';
import { FrameworkSlashCommand } from './commands';
import { RegisteredClient } from './register';


export type GuildOnlyCacheType<G extends boolean> = G extends false ? CacheType : 'cached';

export interface AutocompleterOptions<G extends boolean = true> {
  /** Name of the option the Autocompleter responds to */
  name: string;
  /** Whether the Autocompleter is disabled */
  disabled?: boolean;
  /** Names of the Commands the Autocompleter is used for (defaults to all) */
  commands?: string[];
  /** Whether to only respond in guilds the bot is in (defaults to `true`) */
  guildOnly?: G;
  /** Handle the execution of the Autocompleter */
  execute: (
    client: RegisteredClient, interaction: AutocompleteInteraction<GuildOnlyCacheType<G>>, command: FrameworkSlashCommand, value: string
  ) => unknown;
}


export interface FrameworkAutocompleter<G extends boolean = boolean> extends AutocompleterOptions<G> {
  id: string;
  filepath: string;
  disabled: boolean;
  guildOnly: G;
}


export type AutocompleterEvents = {
  /** Emitted when an autocompleter starts running */
  execute: [context: { command: FrameworkSlashCommand; interaction: AutocompleteInteraction; autocompleter: FrameworkAutocompleter | undefined }];
  /** Emitted when it finishes, with how long it took in ms */
  success: [context: { command: FrameworkSlashCommand; interaction: AutocompleteInteraction; autocompleter: FrameworkAutocompleter | undefined; duration: number }];
  /** Emitted when it throws */
  error: [context: { command: FrameworkSlashCommand; interaction: AutocompleteInteraction; autocompleter: FrameworkAutocompleter | undefined; error: unknown; duration: number }];
  /** Emitted when nothing can answer the interaction */
  unknown: [interaction: AutocompleteInteraction];
};
