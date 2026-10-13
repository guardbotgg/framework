import { FrameworkListener } from '../types';
import { emitClientError } from '../utils';
import { ClientEvents } from 'discord.js';
import BaseModule from './BaseModule';


type Handler = (...args: ClientEvents[keyof ClientEvents]) => Promise<unknown>;

export default class ListenersModule extends BaseModule<FrameworkListener> {
  protected readonly label = 'listener';
  private handlers = new WeakMap<FrameworkListener, Handler>();

  protected get directory() { return this.client.listenersDir; }
  public get collection() { return this.client.events; }

  protected override register(listener: FrameworkListener) {
    const handler: Handler = async (...args) => {
      try {
        return await listener.execute(...args);
      } catch (error) {
        if (listener.name === 'error') console.error(error);
        else emitClientError(this.client, error);
      }
    };

    this.handlers.set(listener, handler);
    this.client[listener.once ? 'once' : 'on'](listener.name, handler);
    super.register(listener);
  }

  protected override unregister(listener: FrameworkListener) {
    const handler = this.handlers.get(listener);
    if (handler) this.client.off(listener.name, handler);
    this.handlers.delete(listener);
    super.unregister(listener);
  }
}
