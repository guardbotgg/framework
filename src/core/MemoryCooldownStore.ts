import { CooldownStore } from '../types';
import { Collection } from 'discord.js';
import { MAX_TIMEOUT } from '../utils';


export class MemoryCooldownStore implements CooldownStore {
  public readonly cooldowns: Collection<string, Collection<string, number>>;

  constructor(cooldowns: Collection<string, Collection<string, number>> = new Collection()) {
    this.cooldowns = cooldowns;
  }

  acquire(id: string, userId: string, duration: number) {
    const users = this.cooldowns.ensure(id, () => new Collection());

    const now = Date.now();
    const expiresAt = (users.get(userId) ?? 0) + duration;
    if (expiresAt > now) return expiresAt;

    users.set(userId, now);
    if (duration <= MAX_TIMEOUT) {
      setTimeout(() => {
        if (users.get(userId) === now) users.delete(userId);
      }, duration).unref();
    }
    return null;
  }
}
