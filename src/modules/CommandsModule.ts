import {
  resolveCommandContexts, resolveIntegrationTypes, createPrefixRegex, resolvePermissions, formatPermissions, emitClientError, emitDebug, requiresCachedGuild,
  replyWithError, passesMiddleware, passesCooldown, passesGuildCheck, replyTemporarily, parseArgs, getSubcommandName, getSubcommandHandler, getTopFolder, reply,
} from '../utils';
import { FrameworkCommand, FrameworkAppCommand, CommandEvents, RegisteredClient } from '../types';
import { ApplicationCommandType, ChatInputCommandInteraction, Collection, ContextMenuCommandInteraction, Interaction, Message } from 'discord.js';
import { FrameworkClient } from '../core/FrameworkClient';
import { FrameworkError } from '../core/FrameworkError';
import BaseModule from './BaseModule';


export default class CommandsModule extends BaseModule<FrameworkCommand, CommandEvents> {
  protected readonly label = 'command';
  private prefixRegex?: { key: string; regex: RegExp };
  private republishTimer?: NodeJS.Timeout;
  protected republishDelay = 60_000;

  protected get directory() { return this.client.commandsDir; }
  public get collection() { return this.client.commands; }

  constructor(client: FrameworkClient) {
    super(client);
    this.client.on('messageCreate', (message) => this.handleMessage(message).catch(error => emitClientError(this.client, error)));
    this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction).catch(error => emitClientError(this.client, error)));
  }


  async publishGlobal(commands?: Collection<string, FrameworkCommand>) {
    const application = this.getApplication('publish global commands');
    const published = await application.commands.set(this.getCommandsData(commands, 'guild'));
    emitDebug(this.client, `Published ${published.size} global application command(s)`);
    return published;
  }

  async publishGuild(guildId: string, commands?: Collection<string, FrameworkCommand>) {
    const application = this.getApplication('publish guild commands');
    const data = this.getCommandsData(commands, 'global');

    const guild = this.client.guilds.cache.get(guildId);
    const published = await (guild ? guild.commands.set(data) : application.commands.set(data, guildId));

    if (!guild) published.forEach((_, id) => application.commands.cache.delete(id));
    emitDebug(this.client, `Published ${published.size} application command(s) to guild "${guildId}"`);
    return published;
  }

  async publishGuilds(guildIds: string[], commands?: Collection<string, FrameworkCommand>) {
    const results = await Promise.allSettled(guildIds.map(guildId => this.publishGuild(guildId, commands)));
    const failed = guildIds.filter((_, i) => results[i]!.status === 'rejected');
    if (failed.length) {
      const errors = results.flatMap(result => (result.status === 'rejected' ? [result.reason] : []));
      throw new FrameworkError('AppCommandRegister', new AggregateError(errors, 'Failed to register commands'), failed);
    }
  }

  override dispose() {
    super.dispose();
    clearTimeout(this.republishTimer);
  }


  protected override onWatchedChange(previous: FrameworkCommand | undefined, current: FrameworkCommand | undefined) {
    const guilds = this.client.registerCommandsOptions?.guilds;
    if (!guilds?.length || !this.client.isReady() || !this.client.isPrimaryShard) return;

    const data = (command?: FrameworkCommand) => (command && command.commandType !== 'Message' ? JSON.stringify(this.getCommandData(command)) : null);
    if (data(previous) === data(current)) return;

    clearTimeout(this.republishTimer);
    this.republishTimer = setTimeout(() => {
      this.publishGuilds(guilds).catch(error => emitClientError(this.client, error));
    }, this.republishDelay).unref();
  }

  protected override register(command: FrameworkCommand) {
    command.category ??= getTopFolder(this.directory, command.filepath);
    super.register(command);
    if (command.commandType !== 'Message') return;
    for (const alias of command.aliases) {
      const owner = this.client.aliases.get(alias);
      if (!owner) this.client.aliases.set(alias, command.id);
      else if (owner !== command.id) emitDebug(this.client, `Skipped the alias "${alias}" of "${command.id}", as "${owner}" already uses it`);
    }
  }

  protected override unregister(command: FrameworkCommand) {
    super.unregister(command);
    if (command.commandType !== 'Message') return;
    for (const alias of command.aliases) if (this.client.aliases.get(alias) === command.id) this.client.aliases.delete(alias);
  }


  private async handleMessage(message: Message) {
    if (!message.content?.length || message.author.bot) return;

    const matchedPrefix = message.content.match(this.getPrefixRegex())?.[0];
    if (!matchedPrefix) return;

    const body = message.content.slice(matchedPrefix.length).trim();
    const rawName = body.split(/\s+/, 1)[0];
    if (!rawName) return;

    const commandName = rawName.toLowerCase();
    const command = this.client.commands.get(`Message:${commandName}`) ?? this.client.commands.get(this.client.aliases.get(commandName) ?? '');
    if (!command || command.commandType !== 'Message' || command.disabled) return;
    if (command.devOnly && !this.client.developers.includes(message.author.id)) return;
    if (!command.contexts.includes(message.inGuild() ? 'Guild' : 'BotDM')) return;

    if (!(await passesMiddleware(this.client, message, command))) return;

    if (message.inGuild()) {
      const [executer, clientMember] = await Promise.all([
        command.memberPermissions ? message.guild.members.fetch({ user: message.author.id, force: false }) : null,
        command.clientPermissions ? message.guild.members.fetchMe({ force: false }) : null,
      ]);
      if ((command.memberPermissions && !executer) || (command.clientPermissions && !clientMember)) return;

      if (command.memberPermissions) {
        const memberPerms = resolvePermissions(executer!, message.channel);
        if (!memberPerms.has(command.memberPermissions)) {
          const missing = memberPerms.missing(command.memberPermissions);
          if (this.client.hooks.onMemberPermissions) return this.client.hooks.onMemberPermissions(message, command, missing);
          return replyTemporarily(message, 'You don\'t have the required permission(s) to use this command.', 10000);
        }
      }

      if (command.clientPermissions) {
        const clientPerms = resolvePermissions(clientMember!, message.channel);
        if (!clientPerms.has(command.clientPermissions)) {
          const missing = clientPerms.missing(command.clientPermissions);
          if (this.client.hooks.onClientPermissions) return this.client.hooks.onClientPermissions(message, command, missing);
          return replyTemporarily(message, `${clientMember!.displayName} requires ${formatPermissions(missing)} permission(s) to run this command.`, 10000);
        }
      }
    }

    if (!(await passesCooldown(this.client, message, command, message.author.id))) return;

    const args = parseArgs(body.slice(rawName.length).trim(), command.quotedArgs);
    await this.runHandler(
      { command, context: message },
      () => command.execute(this.client as RegisteredClient, message as never, args),
      (error) => replyWithError(this.client, message, error, command),
    );
  }


  private async handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

    const command = this.client.commands.get(`${getCommandType(interaction)}:${interaction.commandName}`);
    if (!command || command.disabled || command.commandType === 'Message') return this.emitSafely('unknown', interaction);

    const run = this.getRunner(command, interaction);
    if (!run) return this.emitSafely('unknown', interaction);

    if (!(await passesGuildCheck(this.client, interaction, command, requiresCachedGuild(command)))) return;
    if (!(await passesMiddleware(this.client, interaction, command))) return;

    if (command.clientPermissions && interaction.inCachedGuild()) {
      const missing = interaction.appPermissions.missing(command.clientPermissions);
      if (missing.length) {
        if (this.client.hooks.onClientPermissions) return this.client.hooks.onClientPermissions(interaction, command, missing);
        const name = interaction.guild.members.me?.displayName ?? this.client.user.displayName;
        return await reply(interaction, `${name} requires ${formatPermissions(missing)} permission(s) to run this command.`);
      }
    }

    if (!(await passesCooldown(this.client, interaction, command, interaction.user.id))) return;

    await this.runHandler(
      { command, context: interaction },
      run,
      (error) => replyWithError(this.client, interaction, error, command),
    );
  }


  private getRunner(command: FrameworkAppCommand, interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction): (() => unknown) | null {
    const client = this.client as RegisteredClient;
    if (command.commandType === 'Slash' && command.subcommands && interaction.isChatInputCommand()) {
      const { subcommands } = command;
      const name = getSubcommandName(interaction);
      const handler = name ? getSubcommandHandler(subcommands, name) : undefined;
      if (typeof handler === 'function') return () => handler.call(subcommands, client, interaction as never);
    }
    return command.execute ? () => command.execute!(client, interaction as never) : null;
  }

  private getPrefixRegex() {
    const key = `${this.client.user.id}:${this.client.prefix}`;
    if (this.prefixRegex?.key !== key) this.prefixRegex = { key, regex: createPrefixRegex(this.client.user.id, this.client.prefix) };
    return this.prefixRegex.regex;
  }

  private getApplication(action: string) {
    if (!this.client.application) throw new FrameworkError('ClientNotReady', action);
    return this.client.application;
  }

  private getCommandsData(commands: Collection<string, FrameworkCommand> | undefined, excludedScope: 'guild' | 'global') {
    return (commands ?? this.client.commands)
      .filter((c): c is FrameworkAppCommand => c.commandType !== 'Message' && c.commandScope !== excludedScope && !c.disabled)
      .map(c => this.getCommandData(c));
  }

  private getCommandData(command: FrameworkAppCommand) {
    const base = {
      name: command.name,
      defaultMemberPermissions: command.memberPermissions ?? null,
      contexts: resolveCommandContexts(command.commandContexts),
      integrationTypes: resolveIntegrationTypes(command.integrationTypes),
      nameLocalizations: command.nameLocalizations,
      descriptionLocalizations: command.descriptionLocalizations,
    };

    if (command.commandType === 'Slash') {
      return { ...base, type: ApplicationCommandType.ChatInput as const, description: command.description, options: command.options };
    }
    if (command.commandType === 'ContextMessage') return { ...base, type: ApplicationCommandType.Message as const };
    return { ...base, type: ApplicationCommandType.User as const };
  }
}


function getCommandType(interaction: Interaction) {
  if (interaction.isChatInputCommand()) return 'Slash';
  if (interaction.isUserContextMenuCommand()) return 'ContextUser';
  if (interaction.isMessageContextMenuCommand()) return 'ContextMessage';
  return 'unknown';
}
