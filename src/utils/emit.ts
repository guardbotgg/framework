import { Client } from 'discord.js';


export function emitClientError(client: Client, error: unknown) {
  if (client.listenerCount('error') > 0) client.emit('error', error instanceof Error ? error : new Error(String(error), { cause: error }));
  else console.error(error);
}

export function emitDebug(client: Client, message: string) {
  client.emit('debug', `[Framework] ${message}`);
}
