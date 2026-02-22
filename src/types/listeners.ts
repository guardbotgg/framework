import { ClientEvents } from 'discord.js';


type Result = unknown | void;
export interface ListenerOptions<T extends keyof ClientEvents = keyof ClientEvents> {
  /** Name of the Listener */
  name: T;
  /** Whether to execute only once */
  once?: boolean;
  /** Whether the Listener is disabled */
  disabled?: boolean;
  /** Handles the execution of the Listener */
  execute: (...args: ClientEvents[T]) => Promise<Result> | Result;
}

interface BaseListenerMeta {
  id: string;
  filepath: string;
}

export interface FrameworkListener<T extends keyof ClientEvents = keyof ClientEvents> extends BaseListenerMeta {
  name: T;
  once: boolean;
  disabled: boolean;
  execute: (...args: ClientEvents[T]) => Promise<Result> | Result;
  _execute?: (...args: ClientEvents[T]) => Promise<Result> | Result;
}