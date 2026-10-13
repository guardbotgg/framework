import { CooldownStore, FrameworkAutocompleter, FrameworkClientOptions, FrameworkCommand, FrameworkComponent, FrameworkHooks, FrameworkListener, Middleware, RegisterCommandsOptions } from '../types';
import { emitClientError, emitDebug, listFiles, validateArray, validateOptions, validateRequired, validateType } from '../utils';
import { ClientEvents, Collection, Client as DiscordClient } from 'discord.js';
import { FrameworkError, FrameworkTypeError } from './FrameworkError';
import { MemoryCooldownStore } from './MemoryCooldownStore';
import AutocompletersModule from '../modules/AutocompletersModule';
import ComponentsModule from '../modules/ComponentsModule';
import ListenersModule from '../modules/ListenersModule';
import CommandsModule from '../modules/CommandsModule';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';


export type ModuleName = 'commands' | 'listeners' | 'autocompleters' | 'components';
type ShardBroadcaster = {
  broadcastEval<Result, Context>(script: (client: FrameworkClient, context: Context) => Promise<Result>, options: { context: Context }): Promise<Result[]>;
};

const reloadOnShard = (client: FrameworkClient, context: { module: ModuleName; id: string }): Promise<string | null> => (
  Promise.resolve()
    .then(() => client[`${context.module}Module`].reload(context.id))
    .then(() => null, (error: unknown) => (error instanceof Error ? error.message : String(error)))
);


export class FrameworkClient<Ready extends boolean = boolean> extends DiscordClient<Ready> {
  public prefix: string;
  public developers: string[];
  public rootDir: string;
  public commandsDir: string;
  public listenersDir: string;
  public autocompletersDir: string;
  public componentsDir: string;
  public extensionsDir: string;
  public hooks: FrameworkHooks & { middleware: Middleware[] };
  public cooldownStore: CooldownStore;
  public registerCommandsOptions?: RegisterCommandsOptions;
  #watchFiles: boolean;
  #initPromise?: Promise<void>;

  public autocompleters: Collection<string, FrameworkAutocompleter> = new Collection();
  public components: Collection<string, FrameworkComponent> = new Collection();
  public events: Collection<string, FrameworkListener<keyof ClientEvents>> = new Collection();
  public aliases: Collection<string, string> = new Collection();
  public commands: Collection<string, FrameworkCommand> = new Collection();
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();

  public commandsModule: CommandsModule;
  public componentsModule: ComponentsModule;
  public listenersModule: ListenersModule;
  public autocompletersModule: AutocompletersModule;

  constructor(frameworkOptions: FrameworkClientOptions) {
    validateClientOptions(frameworkOptions);
    super(frameworkOptions.clientOptions);

    const hooks = frameworkOptions.hooks ?? {};
    this.prefix = frameworkOptions.prefix ?? '!';
    this.developers = [...(frameworkOptions.developers ?? [])];
    this.hooks = { ...hooks, middleware: [...(hooks.middleware ?? [])] };
    this.cooldownStore = frameworkOptions.cooldownStore ?? new MemoryCooldownStore(this.cooldowns);
    this.registerCommandsOptions = frameworkOptions.registerCommands;
    this.#watchFiles = frameworkOptions.watch ?? false;

    this.rootDir = path.resolve(frameworkOptions.rootDir);
    this.commandsDir = path.resolve(this.rootDir, frameworkOptions.commandsDir ?? 'commands');
    this.listenersDir = path.resolve(this.rootDir, frameworkOptions.listenersDir ?? 'listeners');
    this.autocompletersDir = path.resolve(this.rootDir, frameworkOptions.autocompletersDir ?? 'autocompleters');
    this.componentsDir = path.resolve(this.rootDir, frameworkOptions.componentsDir ?? 'components');
    this.extensionsDir = path.resolve(this.rootDir, frameworkOptions.extensionsDir ?? 'extensions');

    this.commandsModule = new CommandsModule(this);
    this.componentsModule = new ComponentsModule(this);
    this.listenersModule = new ListenersModule(this);
    this.autocompletersModule = new AutocompletersModule(this);

    this.#routeInteractions();
    this.once('clientReady', () => {
      if (!this.registerCommandsOptions) return;
      if (!this.isPrimaryShard) return emitDebug(this, 'Skipped registering commands, as the process handling shard 0 does it');
      this.#registerCommands(this.registerCommandsOptions).catch(error => emitClientError(this, error));
    });
  }

  public async init() {
    this.#initPromise ??= (async () => {
      await this.#loadExtensions();
      for (const module of componentModules(this)) await module.loadAll();
    })().catch((error) => {
      this.#initPromise = undefined;
      throw error;
    });
    await this.#initPromise;
    if (this.#watchFiles) componentModules(this).forEach(module => module.watch());
  }

  public async start(token: string) {
    await this.init();
    await this.login(token);
  }

  public override async destroy() {
    componentModules(this).forEach(module => module.dispose());
    await super.destroy();
  }

  public get isPrimaryShard() {
    const shards = this.options.shards;
    return !Array.isArray(shards) || shards.includes(0);
  }

  public async broadcastReload(module: ModuleName, id: string) {
    const cluster = Reflect.get(this, 'cluster') as ShardBroadcaster | undefined;
    const broadcaster = cluster ?? (this.shard as ShardBroadcaster | null);
    if (!broadcaster) return this[`${module}Module`].reload(id);

    const results = await broadcaster.broadcastEval(reloadOnShard, { context: { module, id } });
    const failures = results.filter((result): result is string => result !== null);
    if (failures.length) throw new FrameworkError('ShardReload', module, id, failures, results.length);
  }


  async #loadExtensions() {
    const files = await listFiles(this.extensionsDir);

    let loaded = 0;
    for (const file of files) {
      try {
        await import(pathToFileURL(file).href);
        loaded++;
      } catch (error) {
        emitClientError(this, new FrameworkError('ComponentLoadError', 'extension', error, file));
      }
    }
    if (files.length) emitDebug(this, `Loaded ${loaded}/${files.length} extension file(s) from "${this.extensionsDir}"`);
  }

  async #registerCommands(options: RegisterCommandsOptions) {
    const results = await Promise.allSettled([
      options.global ? this.commandsModule.publishGlobal() : null,
      options.guilds?.length ? this.commandsModule.publishGuilds(options.guilds) : null,
    ]);
    for (const result of results) if (result.status === 'rejected') emitClientError(this, result.reason);
  }

  #routeInteractions() {
    this.on('interactionCreate', (interaction) => {
      if (interaction.isAnySelectMenu()) this.emit('selectMenuInteraction', interaction);
      else if (interaction.isModalSubmit()) this.emit('modalSubmitInteraction', interaction);
      else if (interaction.isButton()) this.emit('buttonInteraction', interaction);
    });
  }
}


function componentModules(client: FrameworkClient) {
  return [client.listenersModule, client.autocompletersModule, client.componentsModule, client.commandsModule];
}

function validateClientOptions(options: FrameworkClientOptions) {
  validateOptions(options);
  validateRequired(options.clientOptions, 'clientOptions');
  validateType(options.clientOptions, 'clientOptions', 'object');
  validateRequired(options.rootDir, 'rootDir');
  validateType(options.rootDir, 'rootDir', 'string');
  if (!existsSync(options.rootDir)) throw new FrameworkError('InvalidDirectory', 'rootDir', options.rootDir);

  for (const key of ['commandsDir', 'listenersDir', 'autocompletersDir', 'componentsDir', 'extensionsDir', 'prefix'] as const) {
    validateType(options[key], key, 'string');
  }
  validateArray(options.developers, 'developers', { type: 'string' });
  validateType(options.registerCommands, 'registerCommands', 'object');
  validateArray(options.registerCommands?.guilds, 'registerCommands.guilds', { type: 'string' });
  validateType(options.registerCommands?.global, 'registerCommands.global', 'boolean');

  validateType(options.watch, 'watch', 'boolean');
  validateType(options.hooks, 'hooks', 'object');
  validateArray(options.hooks?.middleware, 'hooks.middleware', { type: 'function' });
  for (const key of ['onCooldown', 'onMemberPermissions', 'onClientPermissions', 'onGuildOnly', 'onError'] as const) {
    validateType(options.hooks?.[key], `hooks.${key}`, 'function');
  }

  validateType(options.cooldownStore, 'cooldownStore', 'object');
  if (options.cooldownStore && typeof options.cooldownStore.acquire !== 'function') {
    throw new FrameworkTypeError('InvalidType', 'cooldownStore', 'CooldownStore', typeof options.cooldownStore);
  }
}
