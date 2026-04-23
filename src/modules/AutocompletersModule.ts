import { AutocompleterEvents, FrameworkAutocompleter } from '../types';
import { listFiles, pathToFileURL, resolvePath } from '../utils';
import { FrameworkClient } from '../core/FrameworkClient';
import { FrameworkError } from '../core/FrameworkError';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Interaction } from 'discord.js';


export default class AutocompletersModule extends TypedEmitter<AutocompleterEvents> {
  private client: FrameworkClient<true>;
  constructor(client: FrameworkClient) {
    super();
    this.client = client as FrameworkClient<true>;
    this.client.on('interactionCreate', (interaction) => this._handleInteraction(interaction));
  }

  async load(filepath: string, reload: boolean = false) {
    const module = await import(pathToFileURL(filepath).href  + `?update=${Date.now()}`);
    const completer: FrameworkAutocompleter = module.autocomplete ?? module.default?.default ?? module.default ?? module;

    if (typeof completer !== 'object' || !completer.name || completer.disabled) return false;
    if (!reload && this.client.autocompleters.has(completer.id)) throw new FrameworkError('ComponentAlreadyLoaded', 'autocomplete', completer.id);

    completer.filepath = filepath;
    this.client.autocompleters.set(completer.id, completer);
    return true;
  }

  async loadAll() {
    const files = await listFiles(this.client.autocompletersDir);

    for (const file of files) {
      try {
        await this.load(resolvePath(file));
      } catch (error) {
        this.client.emit('error', new FrameworkError('ComponentLoadError', 'autocomplete', error));
      }
    }
  }

  async reload(id: string) {
    const completer = this.client.autocompleters.get(id);
    if (!completer) throw new FrameworkError('UnknownComponent', 'autocomplete', id);

    this.unload(id, true);
    await this.load(completer.filepath, true);
  }

  private unload(id: string, reload: boolean = false) {
    if (!this.client.autocompleters.has(id)) throw new FrameworkError('UnknownComponent', 'autocomplete', id);
    const completer = this.client.autocompleters.get(id)!;

    delete require.cache[require.resolve(completer.filepath)];
    if (!reload) this.client.autocompleters.delete(id);
  }


  private async _handleInteraction(interaction: Interaction) {
    if (!interaction.isAutocomplete()) return;

    const option = interaction.options.getFocused(true);
    const command = this.client.commands.get(`Slash:${interaction.commandName}`);
    const autocompleter = this.client.autocompleters.get(option.name);

    if (!command || command.commandType !== 'Slash') {
      this.emit('unknown', interaction);
      return;
    }

    if (!interaction.inCachedGuild()) return;
    const allowed = !autocompleter?.commands?.length || autocompleter.commands.includes(command.name);

    if (autocompleter && !autocompleter.disabled && allowed) {
      try {
        this.emit('execute', { command, interaction, autocompleter });
        await autocompleter.execute(this.client, interaction, command, option.value);
        this.emit('success', { command, interaction, autocompleter });
      } catch (error) {
        this.emit('error', { command, interaction, autocompleter, error });
      }
    }
    else if (typeof command.autocomplete === 'function' && !command.disabled) {
      try {
        this.emit('execute', { command, interaction, autocompleter });
        await command.autocomplete(this.client, interaction);
        this.emit('success', { command, interaction, autocompleter });
      } catch (error) {
        this.emit('error', { command, interaction, autocompleter, error });
      }
    }
    else {
      this.emit('unknown', interaction);
    }
  }
}