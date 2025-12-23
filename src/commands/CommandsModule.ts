import { FrameworkCommand, CommandModuleHandler, CommandHandlerName, FrameworkSlashCommand, FrameworkContextCommand } from '../types';
import { listFiles, resolveCommandContexts, resolveCommandType, resolveIntegrationTypes, unixTimestamp } from '../utils/utils';
import { ApplicationCommandData, Collection, Interaction, Message, MessageFlags } from 'discord.js';
import { FrameworkError } from '../utils/errors';
import FrameworkClient from '../FrameworkClient';
import { pathToFileURL } from 'node:url';
import EventEmitter from 'events';
import path from 'path';


/**
 * @class CommandsModule
 * @fires CommandsModule#execute
 * @fires CommandsModule#success
 * @fires CommandsModule#error
 * @fires CommandsModule#unknown
 */
export default class CommandsModule extends EventEmitter {
  private client: FrameworkClient<true>;
  private handler: CommandModuleHandler = {};

  constructor(client: FrameworkClient) {
    super();
    this.client = client as FrameworkClient<true>;
    this.client.on('messageCreate', (message) => this._handleMessage(message));
    this.client.on('interactionCreate', (interaction) => this._handleInteraction(interaction));
  }

  setHandler<K extends CommandHandlerName>(key: K, callback: NonNullable<CommandModuleHandler[K]>) {
    return this.handler[key] = callback;
  }

  setMessageInterceptor(callback: (message: Message) => Promise<boolean>) {
    return this.handler.MessageCommandInterceptor = callback;
  }

  setInteractionInterceptor(callback: (interaction: Interaction) => Promise<boolean>) {
    return this.handler.InteractionCommandInterceptor = callback;
  }


  async load(filepath: string, reload: boolean = false) {
    const commandModule = await import(pathToFileURL(filepath).href);
    const command: FrameworkCommand = commandModule?.command ?? commandModule?.default?.default ?? commandModule?.default ?? commandModule;

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
    const commandsDir = path.resolve(this.client.rootDir, 'commands');
    const files = await listFiles(commandsDir);

    for (const file of files) {
      try {
        await this.load(path.resolve(file));
      } catch (error) {
        this.client.emit('error', new FrameworkError('ComponentLoadError', 'commands', error));
      }
    }
  }

 
  reload(id: string) {
    if (!this.client.commands.has(id)) throw new FrameworkError('UnknownComponent', 'commands', id);
    const command = this.client.commands.get(id)!;

    this.unload(id, true);
    this.load(command.filepath, true);
  }


  private unload(id: string, reload: boolean = false) {
    if (!this.client.commands.has(id)) throw new FrameworkError('UnknownComponent', 'commands', id);
    const command = this.client.commands.get(id)!;
    
    delete require.cache[command.filepath];
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
    if (this.handler.MessageCommandInterceptor) {
      const shouldContinue = await this.handler.MessageCommandInterceptor(message);
      if (!shouldContinue) return;
    }
    
    const prefixRegex = new RegExp(`^(<@!?${message.client.user.id}>${this.client.prefix ? `|${this.client.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` : ''})\\s*`);
    if (!prefixRegex.test(message.content.toLowerCase())) return;
    const matchedPrefix = message.content.toLowerCase().match(prefixRegex)?.[1];
    if (!matchedPrefix) return;

    const args = (message.content || '').slice(matchedPrefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const commandId = `Message:${commandName}`;
    const command = this.client.commands.get(commandId) || this.client.commands.get(this.client.aliases.get(commandId) || '');
    if (!command || command.commandType !== 'Message' || command.disabled || (command.devOnly && !this.client.developers.includes(message.author.id))) return;
    if ((!message.inGuild() && !command.contexts.includes('BotDM')) || (message.inGuild() && !command.contexts.includes('Guild'))) return;


    if (message.inGuild() && command.memberPermissions) {
      const executor = await message.guild.members.fetch({ user: message.author.id, force: false });
      const memberPerms = executor.permissionsIn(message.channel) ?? executor.permissions;

      if (!memberPerms.has(command.memberPermissions)) {
        const missingPermsArray = memberPerms.missing(command.memberPermissions);
        
        if (typeof this.handler.onMemberPermissions === 'function') return this.handler.onMemberPermissions(message, command, missingPermsArray);
        else return await message.reply({ content: '❌ You don\'t have the required permission(s) to use this command.' }).then(m => {
          setTimeout(() => m.delete().catch(e => null), 10000);
        }).catch(() => null);
      }
    }

    if (message.inGuild() && command.clientPermissions) {
      const clientMember = await message.guild.members.fetchMe({ force: false });
      const clientPerms = clientMember.permissionsIn(message.channel) ?? clientMember.permissions;

      if (!clientMember.permissions.has(command.clientPermissions)) {
        const missingPermsArray = clientPerms.missing(command.clientPermissions);

        if (typeof this.handler.onClientPermissions === 'function') return this.handler.onClientPermissions(message, command, missingPermsArray);
        else return await message.reply({ content: `❌ ${clientMember.displayName} requires ${missingPermsArray.map(p => `\` ${p.replace(/([A-Z])/g, (_, l, i) => i === 0 ? l : ` ${l}`)} \``).join(' ')} permission(s) to run this command.` }).then(m => {
          setTimeout(() => m.delete().catch(e => null), 10000);
        }).catch(() => null);
      }
    }

    if (command.cooldown && command.cooldown > 1000) {
      if (!this.client.cooldowns.has(commandId)) this.client.cooldowns.set(commandId, new Collection());
      const commandCooldowns = this.client.cooldowns.get(commandId);
      
      if (commandCooldowns) {
        if (commandCooldowns.has(message.author.id)) {
          const expirationDate = new Date((commandCooldowns.get(message.author.id) || 0) + command.cooldown);
          
          if (expirationDate.valueOf() - Date.now() > 1000) {
            if (typeof this.handler.onCooldown === 'function') return this.handler.onCooldown(message, command, expirationDate);
            else return await message.reply({ content: `❌ Slow down and try the Command Again **${unixTimestamp(new Date(expirationDate), 'R')}**.` }).then(m => {
              setTimeout(() => m.delete().catch(e => null), expirationDate.valueOf() - Date.now());
            })
          }
        }
        commandCooldowns.set(message.author.id, new Date().valueOf());
        setTimeout(() => commandCooldowns.delete(message.author.id), command.cooldown);
      }
    }

    try {
      this.emit('execute', { context: message, command });
      await command.execute(this.client, message, args);
      this.emit('success', { context: message, command });
    } catch (error) {
      this.emit('error', { context: message, command, error });
    }
  }


  private async _handleInteraction(interaction: Interaction) {

    if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;
    if (this.handler.InteractionCommandInterceptor) {
      const shouldContinue = await this.handler.InteractionCommandInterceptor(interaction);
      if (!shouldContinue) return;
    }

    const commandId = `${this._getCommandId(interaction)}:${interaction.commandName}`;
    const command = this.client.commands.get(commandId);
    if (!command || command.disabled || command.commandType === 'Message') {
      this.emit('unknown', interaction);
      return;
    }
    

    if (interaction.guild && interaction.channel && !interaction.channel.isDMBased() && command.clientPermissions) {
      const clientMember = await interaction.guild.members.fetchMe({ force: false });
      const clientPerms = interaction.channel.isSendable() ? clientMember.permissionsIn(interaction.channel) : clientMember.permissions;

      if (!clientPerms.has(command.clientPermissions)) {
        const missingPermsArray =  clientPerms.missing(command.clientPermissions);
        if (typeof this.handler.onClientPermissions === 'function') return this.handler.onClientPermissions(interaction, command, missingPermsArray);
        else return await interaction.reply({ content: `❌ ${clientMember.displayName} requires ${missingPermsArray.map(p => `\` ${p.replace(/([A-Z])/g, (_, l, i) => i === 0 ? l : ` ${l}`)} \``).join(' ')} permission(s) to run this command.`, flags: MessageFlags.Ephemeral });
      }
    }

    if (command.cooldown && command.cooldown > 1000) {
      if (!this.client.cooldowns.has(commandId)) this.client.cooldowns.set(commandId, new Collection());
      const commandCooldowns = this.client.cooldowns.get(commandId);
      
      if (commandCooldowns) {
        if (commandCooldowns.has(interaction.user.id)) {
          const expirationDate = new Date((commandCooldowns.get(interaction.user.id) || 0) + command.cooldown);
          
          if (expirationDate.valueOf() - Date.now() > 1000) {
            if (typeof this.handler.onCooldown === 'function') return this.handler.onCooldown(interaction, command, expirationDate);
            else return await interaction.reply({ content: `❌ Slow down and try the Command Again **${unixTimestamp(new Date(expirationDate), 'R')}**.`, flags: MessageFlags.Ephemeral });
          }
        }
        commandCooldowns.set(interaction.user.id, new Date().valueOf());
        setTimeout(() => commandCooldowns.delete(interaction.user.id), command.cooldown);
      }
    }

    try {
      this.emit('execute', { context: interaction, command });
      await command.execute(this.client, interaction as any);
      this.emit('success', { context: interaction, command });
    } catch (error) {
      this.emit('error', { context: interaction, command, error });
    }
  }


  private _getCommandId(interaction: Interaction) {
    if (interaction.isChatInputCommand()) return 'Slash';
    else if (interaction.isUserContextMenuCommand()) return 'ContextUser';
    else if (interaction.isMessageContextMenuCommand()) return 'ContextMessage';
    return 'unknown';
  }


  private _getCommandData(command: (FrameworkSlashCommand | FrameworkContextCommand)): ApplicationCommandData {
    return {
      name: command.name,
      description: command.description,
      type: resolveCommandType(command.commandType),
      defaultMemberPermissions: command.memberPermissions ?? null,
      contexts: resolveCommandContexts(command.commandContexts),
      integrationTypes: resolveIntegrationTypes(command.integrationTypes),
      nameLocalizations: command.nameLocalizations,
      descriptionLocalizations: command.descriptionLocalizations,
      ...(command.commandType === 'Slash' ? { options: command.options ?? [] } : {}),
    };
  }
}


/**
 * Emitted when a command is executed
 * @event CommandsModule#execute
 * @param {FrameworkCommand} context.command The command
 * @param {Message|CommandInteraction} context.context The interaction / message
 */

/**
 * Emitted when a command finishes execution successfully
 * @event CommandsModule#execute
 * @param {FrameworkCommand} context.command The command
 * @param {Message|CommandInteraction} context.context The interaction / message
 */

/**
 * Emitted when a command throws an error
 * @event CommandsModule#error
 * @param {FrameworkCommand} context.command The command
 * @param {Message|CommandInteraction} context.context The interaction / message
 * @param {any} context.error The error
 */

/**
 * Emitted when an interaction arrives with a command that is not loaded
 * @event CommandsModule#unknown
 * @param {CommandInteraction} interaction The interaction
 */