import { ContextCommandOptions, CommandContextsInput, IntegrationTypesInput, FrameworkContextCommand } from '../../types';
import { validateOneOf, validateOptions, validateRequired, validateType } from '../../utils';
import { BaseCommand, validateAppCommandOptions } from './BaseCommand';


const ContextCommandTypes = ['ContextMessage', 'ContextUser'] as const;
export function ContextCommand<const C extends CommandContextsInput = undefined, const I extends IntegrationTypesInput = undefined>(options: ContextCommandOptions<C, I>) {
  validateOptions(options);
  validateRequired(options.commandType, 'commandType');
  validateOneOf(options.commandType, 'commandType', ContextCommandTypes);
  validateAppCommandOptions(options);
  validateRequired(options.execute, 'execute');
  validateType(options.execute, 'execute', 'function');

  return BaseCommand({
    ...options,
    description: options.description ?? 'no description',
    commandScope: options.commandScope ?? 'default',
  }) as unknown as FrameworkContextCommand<C, I>;
}
