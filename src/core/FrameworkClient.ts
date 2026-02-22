import { FrameworkAutocompleter, FrameworkClientOptions, FrameworkCommand, FrameworkListener } from '../types';
import { ClientEvents, Collection, Client as DiscordClient } from 'discord.js';
import AutocompletersModule from '../modules/AutocompletersModule';
import ListenersModule from '../modules/ListenersModule';
import CommandsModule from '../modules/CommandsModule';
import { dirExists, resolvePath } from '../utils';


export class FrameworkClient<Ready extends boolean = boolean> extends DiscordClient<Ready> {
  public prefix: string;
  public developers: string[];
  public rootDir: string;
  public commandsDir: string;
  public listenersDir: string;
  public autocompletersDir: string;
  private _inited = false;

  public autocompleters: Collection<string, FrameworkAutocompleter> = new Collection();
  public events: Collection<string, FrameworkListener<keyof ClientEvents>> = new Collection();
  public aliases: Collection<string, string> = new Collection();
  public commands: Collection<string, FrameworkCommand> = new Collection();
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();

  public commandsModule: CommandsModule;
  public listenersModule: ListenersModule;
  public autocompletersModule: AutocompletersModule;

  constructor(frameworkOptions: FrameworkClientOptions) {
    super(frameworkOptions.clientOptions);

    this.prefix = frameworkOptions.prefix ?? '!';
    this.developers = [...(frameworkOptions.developers || [])];

    this.rootDir = frameworkOptions.rootDir ?? (dirExists('./src') ? './src' : './');
    this.commandsDir = resolvePath(this.rootDir, frameworkOptions.commandsDir ?? 'commands');
    this.listenersDir = resolvePath(this.rootDir, frameworkOptions.listenersDir ?? 'listeners');
    this.autocompletersDir = resolvePath(this.rootDir, frameworkOptions.autocompletersDir ?? 'autocompleters');

    this.commandsModule = new CommandsModule(this);
    this.listenersModule = new ListenersModule(this);
    this.autocompletersModule = new AutocompletersModule(this);

    this.routeInteractions();
    this.once('clientReady', async () => {
      if (frameworkOptions.registerOnStart && frameworkOptions.guildsToRegister?.length) {
        await this.commandsModule.registerOnStart(frameworkOptions.guildsToRegister);
      }
    });
  }
  
  public async init() {
    this._inited = true;
    await this.listenersModule.loadAll();
    await this.autocompletersModule.loadAll();
    await this.commandsModule.loadAll();
  }

  public async start(token: string) {
    if (!this._inited) await this.init();
    await this.login(token);
  }

  private routeInteractions() {
    this.on('interactionCreate', (interaction) => {
      if (interaction.isAnySelectMenu()) return this.emit('selectMenuInteraction', interaction);
      else if (interaction.isModalSubmit()) return this.emit('modalSubmitInteraction', interaction);
      else if (interaction.isButton()) return this.emit('buttonInteraction', interaction);
    });
  }
}