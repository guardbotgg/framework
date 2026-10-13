import { MAX_TIMEOUT, validateArray, validateDuration, validateOneOf, validateOptions, validateRequired, validateType, withKind } from '../../utils';
import { ComponentIdleOptions, ComponentOptions, ComponentType, ComponentTypes, FrameworkComponent } from '../../types';
import { FrameworkError, FrameworkTypeError } from '../../core/FrameworkError';


export function Component<const T extends ComponentType, const G extends boolean = true>(options: ComponentOptions<T, G>): FrameworkComponent<T, G> {
  validateOptions(options);

  validateRequired(options.type, 'type');
  if (Array.isArray(options.type)) {
    validateArray(options.type, 'type', { allowed: ComponentTypes });
    if (!options.type.length) throw new FrameworkError('InvalidOption', 'type');
  } else {
    validateOneOf(options.type, 'type', ComponentTypes);
  }
  const types: readonly T[] = Array.isArray(options.type) ? options.type : [options.type as T];

  validateRequired(options.customId, 'customId');
  if (typeof options.customId !== 'string' && !(options.customId instanceof RegExp)) {
    throw new FrameworkTypeError('InvalidType', 'customId', 'string | RegExp', typeof options.customId);
  }
  validateRequired(options.execute, 'execute');
  validateType(options.execute, 'execute', 'function');
  validateType(options.guildOnly, 'guildOnly', 'boolean');
  validateType(options.disabled, 'disabled', 'boolean');
  validateDuration(options.cooldown, 'cooldown');

  validateType(options.idle, 'idle', 'object');
  if (options.idle) validateIdleOptions(options.idle);

  const customId = options.customId instanceof RegExp
    ? new RegExp(options.customId.source, options.customId.flags.replace(/[gy]/g, ''))
    : options.customId;

  return withKind('component', {
    id: `${types.join('|')}:${customId}`,
    name: String(customId),
    filepath: '',
    types,
    customId,
    guildOnly: (options.guildOnly ?? true) as G,
    cooldown: options.cooldown,
    idle: options.idle,
    disabled: options.disabled ?? false,
    execute: options.execute,
  });
}

export function validateIdleOptions(idle: ComponentIdleOptions) {
  if (!idle || typeof idle !== 'object') throw new FrameworkTypeError('InvalidType', 'idle', 'object', typeof idle);
  validateRequired(idle.timeout, 'idle.timeout');
  validateDuration(idle.timeout, 'idle.timeout', { min: 1, max: MAX_TIMEOUT });
  validateRequired(idle.onIdle, 'idle.onIdle');
  validateType(idle.onIdle, 'idle.onIdle', 'function');
}
