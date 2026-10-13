import { validateOptions, validateRequired, validateType, withKind } from '../../utils';
import { FrameworkListener, ListenerOptions } from '../../types';
import { ClientEvents } from 'discord.js';


export function Listener<T extends keyof ClientEvents>(options: ListenerOptions<T>): FrameworkListener<T> {
  validateOptions(options);
  validateRequired(options.name, 'name');
  validateType(options.name, 'name', 'string');
  validateRequired(options.execute, 'execute');
  validateType(options.execute, 'execute', 'function');
  validateType(options.once, 'once', 'boolean');
  validateType(options.disabled, 'disabled', 'boolean');

  return withKind('listener', {
    id: `Client:${options.name}`,
    name: options.name,
    filepath: '',
    once: options.once ?? false,
    disabled: options.disabled ?? false,
    execute: options.execute,
  });
}
