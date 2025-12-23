import { ClientEvents } from 'discord.js';


interface ListenerOptions<T extends keyof ClientEvents = keyof ClientEvents> {
  /** Name of the Listener. */
  name: T;
  /** Wheather to execute the function only Once. */
  once?: boolean;
  /** Whether the Listener is disabled. */
  disabled?: boolean;
  /** Handles the execution of the Listener */
  execute: (...args: ClientEvents[T]) => Promise<boolean>;
}


interface FrameworkListener<T extends keyof ClientEvents = keyof ClientEvents> {
  id: string;
  filepath: string;
  name: T;
  once: boolean;
  disabled: boolean;
  execute: (...args: ClientEvents[T]) => Promise<boolean>;
  _execute?: (...args: ClientEvents[T]) => Promise<boolean>;
}


export {
  ListenerOptions,
  FrameworkListener,
}