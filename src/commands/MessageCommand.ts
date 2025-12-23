import { FrameworkError, FrameworkTypeError } from '../utils/errors';
import { MessageCommandOptions as CommandOptions } from '../types';
import { Command } from './Command';

const Contexts = ['BotDM', 'Guild'];
type MessageCommandOptions = Omit<CommandOptions, 'commandType'>;


export function MessageCommand(options: MessageCommandOptions) {

  if (options.aliases && !Array.isArray(options.aliases)) throw new FrameworkTypeError('InvalidType', 'aliases', 'array', typeof options.aliases);
  if (options.usage && typeof options.usage !== 'string') throw new FrameworkTypeError('InvalidType', 'usage', 'string', typeof options.usage);
  
  if (options.contexts && !Array.isArray(options.contexts)) throw new FrameworkTypeError('InvalidType', 'contexts', 'array', typeof options.contexts);
  if (options.contexts && options.contexts.some(c => !Contexts.includes(c))) throw new FrameworkError('InvalidValues', 'contexts', Contexts);

  if (!options.execute) throw new FrameworkError('InvalidOption', 'execute');
  if (typeof options.execute !== 'function') throw new FrameworkTypeError('InvalidType', 'execute', 'function', typeof options.execute);
  if (options.devOnly !== undefined && typeof options.devOnly !== 'boolean') throw new FrameworkTypeError('InvalidType', 'devOnly', 'boolean', typeof options.devOnly);

  if (!options.contexts) options.contexts = ['Guild'];
  if (options.devOnly === undefined) options.devOnly = false;

  return Command({
    ...options,
    commandType: 'Message',
  });
}


