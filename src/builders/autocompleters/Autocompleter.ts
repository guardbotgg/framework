import { normalizeCommandName, validateArray, validateOptions, validateRequired, validateType, withKind } from '../../utils';
import { AutocompleterOptions, FrameworkAutocompleter } from '../../types';


export function Autocompleter<const G extends boolean = true>(options: AutocompleterOptions<G>): FrameworkAutocompleter<G> {
  validateOptions(options);
  validateRequired(options.name, 'name');
  validateType(options.name, 'name', 'string');
  validateRequired(options.execute, 'execute');
  validateType(options.execute, 'execute', 'function');
  validateArray(options.commands, 'commands', { type: 'string' });
  validateType(options.guildOnly, 'guildOnly', 'boolean');
  validateType(options.disabled, 'disabled', 'boolean');

  const commands = options.commands?.map(name => normalizeCommandName(name, 'Slash'));
  return withKind('autocompleter', {
    id: commands?.length ? `${commands.join('|')}:${options.name}` : options.name,
    name: options.name,
    filepath: '',
    disabled: options.disabled ?? false,
    guildOnly: (options.guildOnly ?? true) as G,
    commands,
    execute: options.execute,
  });
}
