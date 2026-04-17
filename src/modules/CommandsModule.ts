import { listFiles, resolveCommandContexts, resolveIntegrationTypes, unixTimestamp, createPrefixRegex, pathToFileURL, resolvePath, resolvePermissions, formatPermissions } from '../utils';
import { FrameworkCommand, FrameworkSlashCommand, FrameworkContextCommand, CommandCustomHandlers, CommandMiddleware, CommandEvents } from '../types';
import { ApplicationCommandType, Collection, Interaction, Message, MessageFlags } from 'discord.js';
import { FrameworkClient } from '../core/FrameworkClient';
import { FrameworkError } from '../core/FrameworkError';
import { TypedEmitter } from 'tiny-typed-emitter';


export default class CommandsModule extends TypedEmitter<CommandEvents> {
  private client: FrameworkClient<true>;
  private handlers: CommandCustomHandlers = {};
  private middleware?: CommandMiddleware;
  private prefixRegex?: RegExp;

  constructor(client: FrameworkClient) {
    super();
    this.client = client as FrameworkClient<true>;
    this.client.on('messageCreate', (message) => this._handleMessage(message));
    this.client.on('interactionCreate', (interaction) => this._handleInteraction(interaction));
  }

  setHandler<K extends keyof CommandCustomHandlers>(key: K, callback: NonNullable<CommandCustomHandlers[K]>) {
    this.handlers[key] = callback;
    return true;
  }

  setMiddleware(callback: CommandMiddleware) {
    this.middleware = callback;
    return true;
  }


  async load(filepath: string, reload: boolean = false) {
    const module = await import(pathToFileURL(filepath).href  + `?update=${Date.now()}`);
    const command: FrameworkCommand = module?.command ?? module?.default?.default ?? module?.default ?? module;

    if (typeof command !== 'object' || !command.name || command.disabled) return false;
    if (!reload && this.client.commands.has(command.id)) throw new FrameworkError('ComponentAlreadyLoaded', 'command', command.id);

    command.filepath = filepath;
    this.client.commands.set(command.id, command);

    if (command.commandType === 'Message' && Array.isArray(command.aliases)) command.aliases.forEach((alias: any) => {
      if (typeof alias === 'string' && !this.client.aliases.get(alias)) this.client.aliases.set(alias, command.id);
    });
    return true;
  }

  async loadAll() {
    const files = await listFiles(this.client.commandsDir);

    for (const file of files) {
      try {
        await this.load(resolvePath(file));
      } catch (error) {
        this.client.emit('error', new FrameworkError('ComponentLoadError', 'commands', error));
      }
    }
  }
 
  async reload(id: string) {
    if (!this.client.commands.has(id)) throw new FrameworkError('UnknownComponent', 'commands', id);
    const command = this.client.commands.get(id)!;

    this.unload(id, true);
    await this.load(command.filepath, true);
  }

  private unload(id: string, reload: boolean = false) {
    if (!this.client.commands.has(id)) throw new FrameworkError('UnknownComponent', 'commands', id);
    const command = this.client.commands.get(id)!;
    
    delete require.cache[require.resolve(command.filepath)];
    if (!reload) this.client.commands.delete(id);
  }


  async registerOnStart(guildIds: string[], commands?: Collection<string, FrameworkCommand>) {
    for (const guildId of guildIds) {
      try {
        await this.publishGuild(guildId, commands);
      } catch (error) {
        this.client.emit('error', new FrameworkError('AppCommandRegister', error, guildId));
      }
    }
  }

  async publishGlobal(commands?: Collection<string, FrameworkCommand>) {
    if (!this.client.application) return false;
    const commandsToSet = (commands ?? this.client.commands).filter(c => c.commandType !== 'Message' && c.commandScope !== 'guild' && !c.disabled).map((c: any) => this._getCommandData(c));
    return this.client.application.commands.set(commandsToSet);
  }

  async publishGuild(guildId: string, commands?: Collection<string, FrameworkCommand>) {
    const commandsToSet = (commands ?? this.client.commands).filter(c => c.commandType !== 'Message' && c.commandScope !== 'global' && !c.disabled).map((c: any) => this._getCommandData(c));
    const guild = await this.client.guilds.fetch({ guild: guildId, force: false });
    if (guild) guild.commands.set(commandsToSet);
  }


  private async _handleMessage(message: Message) {
    if (!message.content?.length || message.author.bot) return;
    if (!this.prefixRegex) this.prefixRegex = createPrefixRegex(message.client.user.id, this.client.prefix);

    if (!this.prefixRegex.test(message.content.toLowerCase())) return;
    const matchedPrefix = message.content.toLowerCase().match(this.prefixRegex)?.[1];
    if (!matchedPrefix) return;

    const args = (message.content || '').slice(matchedPrefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const commandId = `Message:${commandName}`;
    const command = this.client.commands.get(commandId) || this.client.commands.get(this.client.aliases.get(commandName) || '');
    if (!command || command.commandType !== 'Message' || command.disabled || (command.devOnly && !this.client.developers.includes(message.author.id))) return;
    if ((!message.inGuild() && !command.contexts.includes('BotDM')) || (message.inGuild() && !command.contexts.includes('Guild'))) return;

    if (this.middleware) {
      const shouldContinue = await this.middleware(message, command);
      if (!shouldContinue) return;
    }


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

          if (typeof this.handlers.onMemberPermissions === 'function') return this.handlers.onMemberPermissions(message, command, missing);
          return message.reply({ content: 'You don\'t have the required permission(s) to use this command.' }).then(m => {
            setTimeout(() => m.delete().catch(e => null), 10000);
          }).catch(() => null);
        }
      }

      if (command.clientPermissions) {
        const clientPerms = resolvePermissions(clientMember!, message.channel);
        if (!clientPerms.has(command.clientPermissions))  {  
          const missing = clientPerms.missing(command.clientPermissions);

          if (typeof this.handlers.onClientPermissions === 'function') return this.handlers.onClientPermissions(message, command, missing);
          return message.reply({ content: `${clientMember!.displayName} requires ${formatPermissions(missing)} permission(s) to run this command.` }).then(m => {
            setTimeout(() => m.delete().catch(e => null), 10000);
          }).catch(() => null);
        }
      }
    }

    if (command.cooldown && command.cooldown > 1000) {
      if (!this.client.cooldowns.has(commandId)) this.client.cooldowns.set(commandId, new Collection());
      const commandCooldowns = this.client.cooldowns.get(commandId);
      
      if (commandCooldowns) {
        if (commandCooldowns.has(message.author.id)) {
          const expiresAt = new Date((commandCooldowns.get(message.author.id) || 0) + command.cooldown).valueOf();
          const now = Date.now();

          if (expiresAt - now > 1000) {
            if (typeof this.handlers.onCooldown === 'function') return this.handlers.onCooldown(message, command, new Date(expiresAt));
            return message.reply({ content: `Slow down and try the Command Again **${unixTimestamp(new Date(expiresAt), 'R')}**.` }).then(m => {
              setTimeout(() => m.delete().catch(e => null), expiresAt - Date.now());
            });
          }
        }
        commandCooldowns.set(message.author.id, new Date().valueOf());
        setTimeout(() => commandCooldowns.delete(message.author.id), command.cooldown);
      }
    }


    try {
      this.emit('execute', command, message);
      if (message.inGuild() && command.contexts.includes('Guild')) { 
        await command.execute(this.client, message, args);
      } 
      else if (!message.inGuild() && command.contexts.includes('BotDM')) {
        await command.execute(this.client, message as any, args);
      }
      this.emit('success', command, message);
    } catch (error) {
      this.emit('error', command, message, error);
    }
  }


  private async _handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

    const commandId = `${this._getCommandId(interaction)}:${interaction.commandName}`;
    const command = this.client.commands.get(commandId);
    if (!command || command.disabled || command.commandType === 'Message') {
      this.emit('unknown', interaction);
      return;
    }

    if (this.middleware) {
      const shouldContinue = await this.middleware(interaction, command);
      if (!shouldContinue) return;
    }


    if (!interaction.inCachedGuild() && (command.commandContexts?.includes('Guild') || command.commandContexts?.includes(0))) return;
    if (command.clientPermissions && interaction.inCachedGuild()) {
      const clientMember = await interaction.guild.members.fetchMe({ force: false });
      const clientPerms = resolvePermissions(clientMember, interaction.channel);

      if (!clientPerms.has(command.clientPermissions)) {
        const missing = clientPerms.missing(command.clientPermissions);
        if (typeof this.handlers.onClientPermissions === 'function') return this.handlers.onClientPermissions(interaction, command, missing);
        return interaction.reply({ content: `${clientMember.displayName} requires ${formatPermissions(missing)} permission(s) to run this command.`, flags: MessageFlags.Ephemeral });
      }
    }
   

    if (command.cooldown && command.cooldown > 1000) {
      if (!this.client.cooldowns.has(commandId)) this.client.cooldowns.set(commandId, new Collection());
      const commandCooldowns = this.client.cooldowns.get(commandId);
      
      if (commandCooldowns) {
        if (commandCooldowns.has(interaction.user.id)) {
          const expiresAt = new Date((commandCooldowns.get(interaction.user.id) || 0) + command.cooldown).valueOf();
          
          if (expiresAt - Date.now() > 1000) {
            if (typeof this.handlers.onCooldown === 'function') return this.handlers.onCooldown(interaction, command, new Date(expiresAt));
            return await interaction.reply({ content: `Slow down and try the Command Again **${unixTimestamp(new Date(expiresAt), 'R')}**.`, flags: MessageFlags.Ephemeral });
          }
        }
        commandCooldowns.set(interaction.user.id, new Date().valueOf());
        setTimeout(() => commandCooldowns.delete(interaction.user.id), command.cooldown);
      }
    }


    try {
      this.emit('execute', command, interaction);
      await command.execute(this.client, interaction as any);
      this.emit('success', command, interaction);
    } catch (error) {
      this.emit('error', command, interaction, error);
    }
  }


  private _getCommandId(interaction: Interaction) {
    if (interaction.isChatInputCommand()) return 'Slash';
    else if (interaction.isUserContextMenuCommand()) return 'ContextUser';
    else if (interaction.isMessageContextMenuCommand()) return 'ContextMessage';
    return 'unknown';
  }

  private _getCommandData(command: (FrameworkSlashCommand | FrameworkContextCommand)) {
    const base = {
      name: command.name,
      defaultMemberPermissions: command.memberPermissions ?? null,
      contexts: resolveCommandContexts(command.commandContexts),
      integrationTypes: resolveIntegrationTypes(command.integrationTypes),
      nameLocalizations: command.nameLocalizations,
      descriptionLocalizations: command.descriptionLocalizations,
    };

    if (command.commandType === 'Slash') {
      return {
        ...base,
        type: ApplicationCommandType.ChatInput as const,
        description: command.description,
        options: command.options,
      };
    } else if (command.commandType === 'ContextMessage') {
      return {
        ...base,
        type: ApplicationCommandType.Message as const,
      };
    }

    return {
      ...base,
      type: ApplicationCommandType.User as const,
    };
  }  
}