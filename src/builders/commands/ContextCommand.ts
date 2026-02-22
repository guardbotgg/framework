import { ContextCommandOptions, CommandTypes, CommandScopes, CommandContexts, IntegrationTypes } from '../../types';
import { ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { FrameworkError, FrameworkTypeError } from '../../core/FrameworkError';
import { BaseCommand } from './BaseCommand';


export function ContextCommand(options: ContextCommandOptions) {

  if (!options.commandType) throw new FrameworkError('InvalidOption', 'commandType');
  if (options.commandType !== CommandTypes[2] && options.commandType !== CommandTypes[3]) throw new FrameworkError('InvalidValue', 'commandType', CommandTypes);

  if (!options.commandScope) throw new FrameworkError('InvalidOption', 'commandScope');
  if (typeof options.commandScope !== 'string' || !CommandScopes.includes(options.commandScope)) throw new FrameworkError('InvalidValue', 'commandScope', CommandScopes);

  if (options.commandContexts && !Array.isArray(options.commandContexts)) throw new FrameworkTypeError('InvalidType', 'commandContexts', 'Array', typeof options.commandContexts);
  if (options.commandContexts && options.commandContexts.some(c => !CommandContexts.includes(c))) throw new FrameworkError('InvalidValues', 'commandContexts', CommandContexts);

  if (options.integrationTypes && !Array.isArray(options.integrationTypes)) throw new FrameworkTypeError('InvalidType', 'integrationTypes', 'Array', typeof options.integrationTypes);
  if (options.integrationTypes && options.integrationTypes.some(c => !IntegrationTypes.includes(c))) throw new FrameworkError('InvalidValues', 'integrationTypes', IntegrationTypes);

  if (!options.execute) throw new FrameworkError('InvalidOption', 'execute');
  if (typeof options.execute !== 'function') throw new FrameworkTypeError('InvalidType', 'execute', 'function', typeof options.execute);

  if (!options.commandContexts || !options.commandContexts.length) options.commandContexts = [InteractionContextType.Guild];
  if (!options.integrationTypes || !options.integrationTypes.length) options.integrationTypes = [ApplicationIntegrationType.GuildInstall];

  return BaseCommand({
    ...options,
    commandType: options.commandType,
    description: options.description ?? 'no description',
  });
}