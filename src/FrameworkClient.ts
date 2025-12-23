import { Collection, Client as DiscordClient } from 'discord.js';
import AutocompleteModule from './autocomplete/AutocompleteModule';
import ListenerModule from './listeners/ListenersModule';
import CommandsModule from './commands/CommandsModule';
import { FrameworkClientOptions } from './types';
import fs from 'fs';


export default class FrameworkClient<Ready extends boolean = boolean> extends DiscordClient<Ready> {
  public rootDir: string;
  public prefix: string;
  public developers: string[];

  constructor(frameworkOptions: FrameworkClientOptions) {
    super(frameworkOptions.clientOptions);

    this.prefix = frameworkOptions.prefix ?? '!';
    this.rootDir = frameworkOptions.rootDir ?? (fs.existsSync('./src') ? './src' : './');
    this.developers = frameworkOptions.developers || [];

    this.autocomplete = new Collection();
    this.events = new Collection();
    this.aliases = new Collection();
    this.commands = new Collection();
    this.cooldowns = new Collection();

    this.autocompleteModule = new AutocompleteModule(this);
    this.listenerModule = new ListenerModule(this);
    this.commandsModule = new CommandsModule(this);
    
    this.on('interactionCreate', (interaction) => {
      if (interaction.isAnySelectMenu()) return this.emit('selectMenuInteraction', interaction);
      else if (interaction.isModalSubmit()) return this.emit('modalSubmitInteraction', interaction);
      else if (interaction.isButton()) return this.emit('buttonInteraction', interaction);
    })

    this.once('clientReady', async () => {
      if (frameworkOptions.registerOnStart && frameworkOptions.guildsToRegister?.length) {
        await this.commandsModule.registerOnStart(frameworkOptions.guildsToRegister);
      }
    })
  }


  public async start(token: string) {
    await this.autocompleteModule.loadAll();
    await this.commandsModule.loadAll();
    await this.listenerModule.loadAll();
    await this.login(token);
  }
}