import { MessageCommandOptions as CommandOptions, MessageCommandContexts, MessageCommandContextsInput, FrameworkMessageCommand } from '../../types';
import { normalizeCommandName, validateArray, validateOptions, validateRequired, validateType } from '../../utils';
import { BaseCommand } from './BaseCommand';


type MessageCommandOptions<C extends MessageCommandContextsInput> = Omit<CommandOptions<C>, 'commandType'>;
export function MessageCommand<const C extends MessageCommandContextsInput = undefined>(options: MessageCommandOptions<C>) {
  validateOptions(options);
  validateArray(options.aliases, 'aliases', { type: 'string' });
  validateType(options.usage, 'usage', 'string');
  validateArray(options.contexts, 'contexts', { allowed: MessageCommandContexts });
  validateRequired(options.execute, 'execute');
  validateType(options.execute, 'execute', 'function');
  validateType(options.devOnly, 'devOnly', 'boolean');
  validateType(options.quotedArgs, 'quotedArgs', 'boolean');

  return BaseCommand({
    ...options,
    commandType: 'Message',
    contexts: options.contexts?.length ? options.contexts : ['Guild'],
    aliases: [...new Set((options.aliases ?? []).map(alias => normalizeCommandName(alias, 'Message')).filter(Boolean))],
    devOnly: options.devOnly ?? false,
    quotedArgs: options.quotedArgs ?? false,
  }) as unknown as FrameworkMessageCommand<C>;
}
