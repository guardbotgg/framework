import { FrameworkAutocompleter, FrameworkSlashCommand } from '../types';
import { Interaction, AutocompleteInteraction } from 'discord.js';
import FrameworkClient from '../FrameworkClient';
import { FrameworkError } from '../utils/errors';
import { listFiles } from '../utils/utils';
import { pathToFileURL } from 'node:url';
import EventEmitter from 'events';
import path from 'path';


/**
 * @class AutocompleteModule
 * @fires AutocompleteModule#execute
 * @fires AutocompleteModule#success
 * @fires AutocompleteModule#error
 * @fires AutocompleteModule#unknown
 */
export default class AutocompleteModule extends EventEmitter {
  private client: FrameworkClient<true>;
  constructor(client: FrameworkClient) {
    super();
    this.client = client as FrameworkClient<true>;
    this.client.on('interactionCreate', (interaction) => this._handleInteraction(interaction));
  }

  async load(filepath: string, reload: boolean = false) {
    const completerModule = reload ? require(filepath) : await import(pathToFileURL(filepath).href);
    const completer: FrameworkAutocompleter = completerModule.autocomplete ?? completerModule.default?.default ?? completerModule.default ?? completerModule;

    if (typeof completer !== 'object' || !completer.name || completer.disabled) return false;
    if (!reload && this.client.autocomplete.has(completer.id)) throw new FrameworkError('ComponentAlreadyLoaded', 'autocomplete', completer.id);

    completer.filepath = filepath;
    this.client.autocomplete.set(completer.id, completer);
    return true;
  }

  async loadAll() {
    const listenerDirs = path.resolve(this.client.rootDir, 'autocomplete');
    const files = await listFiles(listenerDirs);

    for (const file of files) {
      try {
        await this.load(path.resolve(file));
      } catch (error) {
        this.client.emit('error', new FrameworkError('ComponentLoadError', 'autocomplete', error));
      }
    }
  }

  async reload(id: string) {
    const completer = this.client.autocomplete.get(id);
    if (!completer) throw new FrameworkError('UnknownComponent', 'autocomplete', id);

    this.unload(id, true);
    await this.load(completer.filepath, true);
  }

  private unload(id: string, reload: boolean = false) {
    if (!this.client.autocomplete.has(id)) throw new FrameworkError('UnknownComponent', 'autocomplete', id);
    const completer = this.client.autocomplete.get(id)!;

    delete require.cache[require.resolve(completer.filepath)];
    if (!reload) this.client.autocomplete.delete(id);
  }


  private async _handleInteraction(interaction: Interaction) {
    if (!interaction.isAutocomplete()) return;

    const option = interaction.options.getFocused(true);
    const command = this.client.commands.get(`Slash:${interaction.commandName}`);
    const completer = this.client.autocomplete.get(option.name);

    if (!option || !command || command.commandType !== 'Slash') {
      this.emit('unknown', interaction);
      return;
    }
    
    if (completer && !completer.disabled) {
      try {
        this.emit('execute', { interaction, command, completer });
        await completer.execute(this.client, interaction, command, option.value);
        this.emit('success', { interaction, command, completer });
      } catch (error) {
        this.emit('success', { interaction, command, completer, error });
      }
    } 
    else if (typeof command.autocomplete === 'function' && !command.disabled) {
      try {
        this.emit('execute', { interaction, command, completer });
        await command.autocomplete(this.client, interaction);
        this.emit('success', { interaction, command, completer });
      } catch (error) {
        this.emit('success', { interaction, command, completer, error });
      }
    }
    else {
      this.emit('unknown', interaction);
    }
  }
}


/**
 * Emitted when a completer is executed
 * @event AutocompleteModule#execute
 * @param {FrameworkSlashCommand} context.command The command
 * @param {FrameworkAutocompleter} context.completer The autocompleter
 * @param {AutocompleteInteraction} context.interaction The autocomplete interaction
 */

/**
 * Emitted when a completer finishes execution successfully
 * @event AutocompleteModule#execute
 * @param {FrameworkSlashCommand} context.command The command
 * @param {FrameworkAutocompleter} context.completer The autocompleter
 * @param {AutocompleteInteraction} context.interaction The autocomplete interaction
 */

/**
 * Emitted when a completer throws an error
 * @event AutocompleteModule#error
 * @param {FrameworkSlashCommand} context.command The command
 * @param {FrameworkAutocompleter} context.completer The autocompleter
 * @param {AutocompleteInteraction} context.interaction The autocomplete interaction
 * @param {Error} context.error The error
 */

/**
 * Emitted when an interaction arrives with a completer that is not loaded
 * @event AutocompleteModule#unknown
 * @param {AutocompleteInteraction} interaction The interaction
 */