import { FrameworkError, FrameworkTypeError } from '../../core/FrameworkError';
import { AutocompleterOptions } from '../../types';


export function Autocompleter(options: AutocompleterOptions) {
  
  if (!options) throw new FrameworkError('NoOptions');
  if (typeof options !== 'object') throw new FrameworkTypeError('InvalidType', 'options', 'object', typeof options);
  
  if (!options.name || !options.name?.length) throw new FrameworkError('InvalidOption', 'name');
  if (typeof options.name !== 'string') throw new FrameworkTypeError('InvalidType', 'name', 'string', typeof options.name);

  if (!options.execute) throw new FrameworkError('InvalidOption', 'execute');
  if (typeof options.execute !== 'function') throw new FrameworkTypeError('InvalidType', 'execute', 'function', typeof options.execute);
  
  if (options.commands && !Array.isArray(options.commands)) throw new FrameworkTypeError('InvalidType', 'commands', 'string[]', typeof options.commands);
  if (options.disabled !== undefined && typeof options.disabled !== 'boolean') throw new FrameworkTypeError('InvalidType', 'disabled', 'boolean', typeof options.disabled);

  return {
    id: options.name,
    name: options.name,
    disabled: options.disabled ?? false,
    execute: options.execute,
  }
}