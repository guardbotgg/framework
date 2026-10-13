import { AutocompleterEvents, FrameworkAutocompleter, RegisteredClient } from '../types';
import { emitClientError, requiresCachedGuild } from '../utils';
import { FrameworkClient } from '../core/FrameworkClient';
import { Interaction } from 'discord.js';
import BaseModule from './BaseModule';


export default class AutocompletersModule extends BaseModule<FrameworkAutocompleter, AutocompleterEvents> {
  protected readonly label = 'autocompleter';

  protected get directory() { return this.client.autocompletersDir; }
  public get collection() { return this.client.autocompleters; }

  constructor(client: FrameworkClient) {
    super(client);
    this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction).catch(error => emitClientError(this.client, error)));
  }

  find(optionName: string, commandName: string): FrameworkAutocompleter | undefined {
    let fallback: FrameworkAutocompleter | undefined;
    for (const autocompleter of this.collection.values()) {
      if (autocompleter.disabled || autocompleter.name !== optionName) continue;
      if (!autocompleter.commands?.length) fallback ??= autocompleter;
      else if (autocompleter.commands.includes(commandName)) return autocompleter;
    }
    return fallback;
  }


  private async handleInteraction(interaction: Interaction) {
    if (!interaction.isAutocomplete()) return;

    const option = interaction.options.getFocused(true);
    const command = this.client.commands.get(`Slash:${interaction.commandName}`);
    if (!command || command.commandType !== 'Slash' || command.disabled) return this.emitSafely('unknown', interaction);

    const autocompleter = this.find(option.name, command.name);
    if (!autocompleter && typeof command.autocomplete !== 'function') return this.emitSafely('unknown', interaction);

    const guildOnly = autocompleter ? autocompleter.guildOnly : requiresCachedGuild(command);
    if (guildOnly && !interaction.inCachedGuild()) return;

    await this.runHandler({ command, interaction, autocompleter }, () => (autocompleter
      ? autocompleter.execute(this.client as RegisteredClient, interaction as never, command, option.value)
      : command.autocomplete!(this.client as RegisteredClient, interaction as never)
    ));
  }
}
