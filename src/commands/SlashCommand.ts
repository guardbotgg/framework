import { ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { FrameworkError, FrameworkTypeError } from '../utils/errors';
import { SlashCommandOptions as CommandOptions } from '../types';
import { Command } from './Command';

const CommandScope = ['default', 'guild', 'global'];
const CommandContexts = ['Guild', 'BotDM', 'PrivateChannel', 0, 1, 2];
const IntegrationTypes = ['GuildInstall', 'UserInstall', 0, 1];
type SlashCommandOptions = Omit<CommandOptions, 'commandType'>;


export function SlashCommand(options: SlashCommandOptions) {

  if (!options.commandScope) throw new FrameworkError('InvalidOption', 'commandScope');
  if (typeof options.commandScope !== 'string' || !CommandScope.includes(options.commandScope)) throw new FrameworkError('InvalidValue', 'commandScope', CommandScope);

  if (options.commandContexts && !Array.isArray(options.commandContexts)) throw new FrameworkTypeError('InvalidType', 'commandContexts', 'Array', typeof options.commandContexts);
  if (options.commandContexts && options.commandContexts.some(c => !CommandContexts.includes(c))) throw new FrameworkError('InvalidValues', 'commandContexts', CommandContexts);

  if (options.integrationTypes && !Array.isArray(options.integrationTypes)) throw new FrameworkTypeError('InvalidType', 'integrationTypes', 'Array', typeof options.integrationTypes);
  if (options.integrationTypes && options.integrationTypes.some(c => !IntegrationTypes.includes(c))) throw new FrameworkError('InvalidType', 'integrationTypes', IntegrationTypes);

  if (!options.execute) throw new FrameworkError('InvalidOption', 'execute');
  if (typeof options.execute !== 'function') throw new FrameworkTypeError('InvalidType', 'execute', 'function', typeof options.execute);

  if (!options.commandContexts) options.commandContexts = [InteractionContextType.Guild];
  if (!options.integrationTypes) options.integrationTypes = [ApplicationIntegrationType.GuildInstall];

  return Command({
    ...options,
    commandType: 'Slash',
  });
}