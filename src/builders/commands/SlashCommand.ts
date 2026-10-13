import { BaseSlashCommandOptions, CommandContextsInput, IntegrationTypesInput, FrameworkSlashCommand, SlashCommandHandlers } from '../../types';
import { getSubcommandHandler, getSubcommandNames, normalizeOptions, validateOptions, validateType } from '../../utils';
import { FrameworkError, FrameworkTypeError } from '../../core/FrameworkError';
import { BaseCommand, validateAppCommandOptions } from './BaseCommand';
import { APIApplicationCommandOption } from 'discord.js';


type SlashCommandOptions<C extends CommandContextsInput, I extends IntegrationTypesInput> = (
  Omit<BaseSlashCommandOptions<C, I>, 'commandType'> & SlashCommandHandlers<C, I>
);

export function SlashCommand<const C extends CommandContextsInput = undefined, const I extends IntegrationTypesInput = undefined>(options: SlashCommandOptions<C, I>) {
  validateOptions(options);
  validateAppCommandOptions(options);
  validateType(options.execute, 'execute', 'function');
  validateType(options.subcommands, 'subcommands', 'object');
  validateType(options.autocomplete, 'autocomplete', 'function');
  if (options.options !== undefined && !Array.isArray(options.options) && typeof options.options !== 'function') {
    throw new FrameworkTypeError('InvalidType', 'options', 'Array | function', typeof options.options);
  }

  const commandOptions = normalizeOptions(options.options);
  validateHandlers(options, commandOptions);

  return BaseCommand({
    ...options,
    commandType: 'Slash',
    commandScope: options.commandScope ?? 'default',
    options: commandOptions,
  }) as unknown as FrameworkSlashCommand<C, I>;
}

function validateHandlers({ execute, subcommands }: { execute?: unknown; subcommands?: Record<string, unknown> }, options: APIApplicationCommandOption[]) {
  if (!execute && !subcommands) throw new FrameworkError('InvalidOption', 'execute', 'subcommands');
  if (!subcommands) return;

  const names = getSubcommandNames(options);
  for (const [name, handler] of Object.entries(subcommands)) {
    if (!names.includes(name)) throw new FrameworkError('UnknownSubcommand', name, names);
    validateType(handler, `subcommands.${name}`, 'function');
  }
  if (execute) return;

  if (!names.length) throw new FrameworkError('InvalidOption', 'execute');
  const unhandled = names.find(name => typeof getSubcommandHandler(subcommands, name) !== 'function');
  if (unhandled) throw new FrameworkError('InvalidOption', `subcommands.${unhandled}`, 'execute');
}
