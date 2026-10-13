import { BaseMessageOptions, Message, MessageFlags, RepliableInteraction } from 'discord.js';
import { FrameworkCommand, FrameworkComponent, TimestampTypes } from '../types';
import type { FrameworkClient } from '../core/FrameworkClient';
import { MAX_TIMEOUT } from './validation';
import { emitClientError } from './emit';


export function reply(context: Message | RepliableInteraction, content: string | BaseMessageOptions): Promise<unknown> {
  const options = typeof content === 'string' ? { content } : content;
  if (!('isRepliable' in context)) return context.reply(options);
  if (context.deferred && !context.replied && context.isCommand()) return context.editReply(options);

  const ephemeral = { ...options, flags: MessageFlags.Ephemeral } as const;
  return context.replied || context.deferred ? context.followUp(ephemeral) : context.reply(ephemeral);
}

export function replyTemporarily(message: Message, content: string, ms: number) {
  return message.reply({ content }).then(sent => {
    setTimeout(() => sent.delete().catch(() => null), Math.min(ms, MAX_TIMEOUT)).unref();
  }).catch(() => null);
}

export async function replyWithError(client: FrameworkClient<true>, context: Message | RepliableInteraction, error: unknown, source: FrameworkCommand | FrameworkComponent) {
  try {
    if (client.hooks.onError) return await client.hooks.onError(context, error, source);
    if (!('isRepliable' in context) || !context.isRepliable()) return;
    await reply(context, 'Something went wrong while running this. Please try again later.');
  } catch (replyError) {
    emitClientError(client, replyError);
  }
}

export function unixTimestamp(date: Date | number, type: TimestampTypes = 'f'): string {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${type}>`;
}

export function formatPermissions(permissions: string[]): string {
  return permissions.map(p => `\`${p.replace(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')}\``).join(', ');
}
