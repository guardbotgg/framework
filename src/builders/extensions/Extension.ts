import { ExtendableStructure, ExtensionOptions, FrameworkExtension } from '../../types';
import { FrameworkError, FrameworkTypeError } from '../../core/FrameworkError';
import { validateType } from '../../utils';


const EXTENSION_KEYS = Symbol.for('@guardbot/framework.extensionKeys');
function getExtensionKeys(prototype: object): Set<PropertyKey> {
  if (!Object.hasOwn(prototype, EXTENSION_KEYS)) {
    Object.defineProperty(prototype, EXTENSION_KEYS, { value: new Set(), enumerable: false });
  }
  return Reflect.get(prototype, EXTENSION_KEYS);
}


export function Extension<S extends object, M extends object>(
  structure: ExtendableStructure<S>, members: M & ThisType<S & M>, options: ExtensionOptions = {},
): FrameworkExtension<S, M> {
  if (!structure || typeof structure.prototype !== 'object' || structure.prototype === null) {
    throw new FrameworkTypeError('InvalidType', 'structure', 'class', typeof structure);
  }
  if (!members || typeof members !== 'object') throw new FrameworkTypeError('InvalidType', 'members', 'object', typeof members);
  validateType(options.override, 'override', 'boolean');

  const prototype: object = structure.prototype;
  const structureName = structure.name || 'structure';
  const extensionKeys = getExtensionKeys(prototype);
  const descriptors = Object.getOwnPropertyDescriptors(members);
  const keys = Reflect.ownKeys(descriptors);

  for (const key of keys) {
    const { value } = descriptors[key as keyof typeof descriptors];
    if (key in prototype && !extensionKeys.has(key) && !options.override) throw new FrameworkError('ExtensionConflict', structureName, String(key));
    if (typeof value === 'object' && value !== null) throw new FrameworkTypeError('ExtensionDefault', structureName, String(key));
  }

  for (const key of keys) {
    const descriptor = descriptors[key as keyof typeof descriptors];
    Object.defineProperty(prototype, key, 'value' in descriptor
      ? { value: descriptor.value, writable: true, configurable: true, enumerable: false }
      : { get: descriptor.get, set: descriptor.set, configurable: true, enumerable: false }
    );
    extensionKeys.add(key);
  }

  return { structure, members, keys };
}
