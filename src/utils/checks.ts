import { reply, replyTemporarily, unixTimestamp } from './replies';
import { FrameworkCommand, FrameworkComponent } from '../types';
import type { FrameworkClient } from '../core/FrameworkClient';
import { Message, RepliableInteraction } from 'discord.js';
import { emitClientError, emitDebug } from './emit';


type Source = FrameworkCommand | FrameworkComponent;

export async function passesMiddleware(client: FrameworkClient<true>, context: Message | RepliableInteraction, source: Source) {
  for (const middleware of client.hooks.middleware ?? []) {
    if (!(await middleware(context, source))) return false;
  }
  return true;
}

export async function passesCooldown(client: FrameworkClient<true>, context: Message | RepliableInteraction, source: Source, userId: string) {
  if (!source.cooldown) return true;

  let expiresAt: number | null;
  try {
    expiresAt = await client.cooldownStore.acquire(source.id, userId, source.cooldown);
  } catch (error) {
    emitClientError(client, error);
    return true;
  }
  if (!expiresAt) return true;

  if (client.hooks.onCooldown) {
    await client.hooks.onCooldown(context, source, new Date(expiresAt));
  } else {
    const content = `Slow down and try again **${unixTimestamp(expiresAt, 'R')}**.`;
    if ('isRepliable' in context) await reply(context, content);
    else await replyTemporarily(context, content, Math.max(expiresAt - Date.now(), 1000));
  }
  return false;
}

export async function passesGuildCheck(client: FrameworkClient<true>, interaction: RepliableInteraction, source: Source, guildOnly: boolean) {
  if (!guildOnly || interaction.inCachedGuild()) return true;
  if (interaction.inGuild()) {
    emitDebug(client, `"${source.id}" was used in guild "${interaction.guildId}", which isn't cached: is the bot in it, with the Guilds intent?`);
  }

  if (client.hooks.onGuildOnly) await client.hooks.onGuildOnly(interaction, source);
  else await reply(interaction, `This can only be used in servers ${client.user.displayName} is in.`);
  return false;
}
