import { FrameworkClient } from '../core/FrameworkClient';
import { AutocompleteInteraction } from 'discord.js';
import { FrameworkSlashCommand } from './commands';


type Result = unknown | void;
export interface AutocompleterOptions {
  /** Name of the Autocompleter */
  name: string;
  /** Whether the Autocompleter is disabled */
  disabled?: boolean;
  /** Command Names the Autocompleter applies to */
  commands?: string[];
  /** Handle the execution of the Autocompleter */
  execute: (
    client: FrameworkClient<true>, interaction: AutocompleteInteraction<'cached'>, command: FrameworkSlashCommand, value: string
  ) => Promise<Result> | Result;
}

interface BaseAutocompleterMeta {
  id: string;
  filepath: string;
}

export interface FrameworkAutocompleter extends BaseAutocompleterMeta {
  name: string;
  disabled: boolean;
  commands?: string[];
  execute: (
    client: FrameworkClient<true>, interaction: AutocompleteInteraction<'cached'>, command: FrameworkSlashCommand, value: string
  ) => Promise<Result> | Result;
}