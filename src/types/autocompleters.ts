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


export interface AutocompleterEvents {
  /** Fired when an autocompleter starts execution */
  execute: (command: FrameworkSlashCommand, interaction: AutocompleteInteraction, autocompleter: FrameworkAutocompleter | undefined) => void;
  /** Fired when execution completes successfully */
  success: (command: FrameworkSlashCommand, interaction: AutocompleteInteraction, autocompleter: FrameworkAutocompleter | undefined) => void;
  /** Fired when execution throws an error */
  error: (command: FrameworkSlashCommand, interaction: AutocompleteInteraction, autocompleter: FrameworkAutocompleter | undefined, error: unknown) => void;
  /** Fired when no matching autocompleter is found */
  unknown: (interaction: AutocompleteInteraction) => void;
}