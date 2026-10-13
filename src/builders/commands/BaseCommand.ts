import { isPermissionResolvable, normalizeCommandName, validateArray, validateDuration, validateOneOf, validateOptions, validateRequired, validateType, withKind } from '../../utils';
import { BaseCommandOptions, CommandContexts, CommandScopes, CommandTypes, IntegrationTypes } from '../../types';
import { FrameworkTypeError } from '../../core/FrameworkError';


export function BaseCommand<T extends BaseCommandOptions>(options: T) {
  validateOptions(options);

  validateRequired(options.name, 'name');
  validateType(options.name, 'name', 'string');
  validateRequired(options.description, 'description');
  validateType(options.description, 'description', 'string');
  validateRequired(options.commandType, 'commandType');
  validateOneOf(options.commandType, 'commandType', CommandTypes);

  for (const key of ['memberPermissions', 'clientPermissions'] as const) {
    if (options[key] !== undefined && !isPermissionResolvable(options[key])) {
      throw new FrameworkTypeError('InvalidType', key, 'PermissionResolvable', typeof options[key]);
    }
  }
  validateDuration(options.cooldown, 'cooldown');
  validateType(options.disabled, 'disabled', 'boolean');
  validateType(options.category, 'category', 'string');

  const name = normalizeCommandName(options.name, options.commandType);
  return withKind('command', {
    ...options,
    id: `${options.commandType}:${name}`,
    filepath: '',
    name,
    disabled: options.disabled ?? false,
  });
}

export function validateAppCommandOptions(options: { commandScope?: unknown; commandContexts?: unknown; integrationTypes?: unknown }) {
  if (options.commandScope !== undefined) validateOneOf(options.commandScope, 'commandScope', CommandScopes);
  validateArray(options.commandContexts, 'commandContexts', { allowed: CommandContexts });
  validateArray(options.integrationTypes, 'integrationTypes', { allowed: IntegrationTypes });
}
