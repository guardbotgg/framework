import { FrameworkError, FrameworkTypeError } from '../utils/errors';
import { isPermissionResolvable } from '../utils/utils';
import { BaseCommandOptions } from '../types';


const CommandTypes = ['Slash', 'Message', 'ContextMessage', 'ContextUser'];
export function Command(options: BaseCommandOptions) {

  if (!options) throw new FrameworkError('NoOptions');
  if (typeof options !== 'object') throw new FrameworkTypeError('InvalidType', 'options', 'object', typeof options);

  if (!options.name || !options.name?.length) throw new FrameworkError('InvalidOption', 'name');
  if (typeof options.name !== 'string') throw new FrameworkTypeError('InvalidType', 'name', 'string', typeof options.name);

  if (!options.description || !options.description?.length) throw new FrameworkError('InvalidOption', 'description');
  if (typeof options.description !== 'string') throw new FrameworkTypeError('InvalidType', 'description', 'string', typeof options.name);

  if (!options.commandType) throw new FrameworkError('InvalidOption', 'commandType');
  if (!CommandTypes.includes(options.commandType)) throw new FrameworkError('InvalidValue', 'commandType', CommandTypes);

  if (options.memberPermissions !== undefined && !isPermissionResolvable(options.memberPermissions)) throw new FrameworkTypeError('InvalidType', 'memberPermissions', 'PermissionResolvable', typeof options.memberPermissions);
  if (options.clientPermissions !== undefined && !isPermissionResolvable(options.clientPermissions)) throw new FrameworkTypeError('InvalidType', 'clientPermissions', 'PermissionResolvable', typeof options.clientPermissions);

  if (options.cooldown && typeof options.cooldown !== 'number') throw new FrameworkTypeError('InvalidType', 'cooldown', 'number', typeof options.cooldown);
  if (options.disabled !== undefined && typeof options.disabled !== 'boolean') throw new FrameworkTypeError('InvalidType', 'disabled', 'boolean', typeof options.disabled);


  return {
    ...options,
    id: `${options.commandType}:${options.name}`,
    name: options.name,
    description: options.description,
    commandType: options.commandType,
    memberPermissions: options.memberPermissions ?? undefined,
    clientPermissions: options.clientPermissions ?? undefined,
    cooldown: options.cooldown ?? undefined,
    disabled: options.disabled ?? false,
  }
}