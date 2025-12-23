import { FrameworkError, FrameworkTypeError } from '../utils/errors';
import { ListenerOptions } from '../types';
import { ClientEvents } from 'discord.js';


export function Listener<T extends keyof ClientEvents>(options: ListenerOptions<T>) {

  if (!options) throw new FrameworkError('NoOptions');
  if (typeof options !== 'object') throw new FrameworkTypeError('InvalidType', 'options', 'object', typeof options);

  if (!options.name || !options.name?.length) throw new FrameworkError('InvalidOption', 'name');
  if (typeof options.name !== 'string') throw new FrameworkTypeError('InvalidType', 'name', 'string', typeof options.name);

  if (!options.execute) throw new FrameworkError('InvalidOption', 'execute');
  if (typeof options.execute !== 'function') throw new FrameworkTypeError('InvalidType', 'execute', 'function', typeof options.execute);

  if (options.once !== undefined && typeof options.once !== 'boolean') throw new FrameworkTypeError('InvalidType', 'once', 'boolean', typeof options.once);
  if (options.disabled !== undefined && typeof options.disabled !== 'boolean') throw new FrameworkTypeError('InvalidType', 'disabled', 'boolean', typeof options.disabled);

  return {
    id: `Client:${options.name}`,
    name: options.name,
    once: options.once ?? false,
    disabled: options.disabled ?? false,
    execute: options.execute,
  } 
}