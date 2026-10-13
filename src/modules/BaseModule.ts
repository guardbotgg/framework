import { listFiles, importFresh, clearRequireCache, emitClientError, emitDebug, isModuleFile, kindOf, ComponentKind, COMPONENT_EXPORTS } from '../utils';
import { FrameworkClient } from '../core/FrameworkClient';
import { FrameworkError } from '../core/FrameworkError';
import { existsSync, watch, FSWatcher } from 'node:fs';
import { EventEmitter } from 'node:events';
import { Collection } from 'discord.js';
import path from 'node:path';


const WATCH_DEBOUNCE_MS = 100;

export interface LoadableComponent {
  id: string;
  name: string;
  disabled: boolean;
  filepath: string;
}

type SkipReason = 'disabled' | 'missing';
type HandlerPayload<Events> = Events extends { execute: [infer Payload] } ? Payload : never;


export default abstract class BaseModule<T extends LoadableComponent, Events extends Record<keyof Events, unknown[]> = Record<never, never>> extends EventEmitter<Events> {
  protected client: FrameworkClient<true>;
  private watcher?: FSWatcher;
  private pendingChanges = new Map<string, NodeJS.Timeout>();
  private changeQueue: Promise<void> = Promise.resolve();

  protected abstract readonly label: ComponentKind;
  protected abstract get directory(): string;
  public abstract get collection(): Collection<string, T>;

  constructor(client: FrameworkClient) {
    super();
    this.client = client as FrameworkClient<true>;
  }


  async load(filepath: string, reload: boolean = false) {
    return (await this.loadFile(filepath, reload)) === null;
  }

  async loadAll() {
    const files = await listFiles(this.directory);

    let loaded = 0;
    for (const file of files) {
      try {
        const skipped = await this.loadFile(file, false);
        if (!skipped) loaded++;
        else emitDebug(this.client, `Skipped "${file}", as ${skipped === 'disabled' ? `its ${this.label} is disabled` : `it doesn't export a ${this.label}`}`);
      } catch (error) {
        emitClientError(this.client, new FrameworkError('ComponentLoadError', this.label, error, file));
      }
    }

    const skipped = files.length - loaded;
    emitDebug(this.client, `Loaded ${loaded} ${this.label}(s)${skipped ? ` (${skipped} skipped: disabled, invalid or failed)` : ''} from "${this.directory}"`);
  }

  async reload(id: string) {
    const previous = this.collection.get(id);
    if (!previous) throw new FrameworkError('UnknownComponent', this.label, id);

    this.remove(previous);
    let skipped: SkipReason | null;
    try {
      skipped = await this.loadFile(previous.filepath, false);
      if (skipped === 'missing') throw new FrameworkError('InvalidComponent', this.label, previous.filepath);
    } catch (error) {
      this.register(previous);
      throw error;
    }
    emitDebug(this.client, skipped ? `Unloaded ${this.label} "${id}", as it was disabled` : `Reloaded ${this.label} "${id}"`);
  }

  unload(id: string) {
    const component = this.collection.get(id);
    if (!component) throw new FrameworkError('UnknownComponent', this.label, id);

    this.remove(component);
    emitDebug(this.client, `Unloaded ${this.label} "${id}"`);
  }

  watch() {
    if (this.watcher || !existsSync(this.directory)) return;

    this.watcher = watch(this.directory, { recursive: true }, (_, filename) => {
      if (!filename || !isModuleFile(filename)) return;
      const filepath = path.join(this.directory, filename);

      clearTimeout(this.pendingChanges.get(filepath));
      this.pendingChanges.set(filepath, setTimeout(() => {
        this.pendingChanges.delete(filepath);
        this.changeQueue = this.changeQueue
          .then(() => this.handleFileChange(filepath))
          .catch(error => emitClientError(this.client, error));
      }, WATCH_DEBOUNCE_MS).unref());
    }).unref();

    this.watcher.on('error', (error) => {
      this.unwatch();
      emitClientError(this.client, error);
    });
    emitDebug(this.client, `Watching "${this.directory}" for changes`);
  }

  unwatch() {
    this.watcher?.close();
    this.watcher = undefined;
    this.pendingChanges.forEach(timer => clearTimeout(timer));
    this.pendingChanges.clear();
  }

  dispose() {
    this.unwatch();
  }

  protected onWatchedChange(_previous: T | undefined, _current: T | undefined) {}

  protected register(component: T) {
    this.collection.set(component.id, component);
  }

  protected unregister(component: T) {
    this.collection.delete(component.id);
  }


  protected async runHandler(payload: HandlerPayload<Events>, handler: () => unknown, onError?: (error: unknown) => unknown) {
    const started = performance.now();
    this.emitUnchecked('execute', payload);
    try {
      await handler();
    } catch (error) {
      this.emitError({ ...(payload as object), error, duration: performance.now() - started });
      await onError?.(error);
      return;
    }
    this.emitUnchecked('success', { ...(payload as object), duration: performance.now() - started });
  }

  protected emitSafely<K extends keyof Events & string>(event: K, ...args: Events[K]) {
    this.emitUnchecked(event, ...args);
  }

  protected emitError(payload: { error: unknown; [key: string]: unknown }) {
    if ((this as unknown as EventEmitter).listenerCount('error') > 0) this.emitUnchecked('error', payload);
    else emitClientError(this.client, payload.error);
  }

  private emitUnchecked(event: string, ...args: unknown[]) {
    try {
      (this as unknown as EventEmitter).emit(event, ...args);
    } catch (error) {
      emitClientError(this.client, error);
    }
  }


  private async loadFile(file: string, reload: boolean): Promise<SkipReason | null> {
    const filepath = path.resolve(file);
    if (reload) clearRequireCache(filepath);
    const component = await this.importComponent(filepath);
    if (!component) return 'missing';
    if (component.disabled) return 'disabled';

    const existing = this.collection.get(component.id);
    if (existing && !reload) throw new FrameworkError('ComponentAlreadyLoaded', this.label, component.id);
    if (existing) this.unregister(existing);

    component.filepath = filepath;
    this.register(component);
    return null;
  }

  private async importComponent(filepath: string): Promise<T | null> {
    const exports = await importFresh(filepath);
    const candidates = [exports?.[COMPONENT_EXPORTS[this.label]], exports?.default?.default, exports?.default];
    const component = candidates.find(value => kindOf(value) === this.label);
    if (component) return component as T;

    const otherKind = [...candidates, ...Object.values(COMPONENT_EXPORTS).map(name => exports?.[name])].map(kindOf).find(Boolean);
    if (otherKind) throw new FrameworkError('ComponentTypeMismatch', this.label, otherKind, filepath);
    return null;
  }

  private async handleFileChange(filepath: string) {
    const previous = this.collection.find(c => c.filepath === filepath);
    try {
      if (!existsSync(filepath)) {
        if (previous) this.unload(previous.id);
      } else if (previous) {
        await this.reload(previous.id);
      } else {
        clearRequireCache(filepath);
        if (await this.load(filepath)) emitDebug(this.client, `Loaded new ${this.label} from "${filepath}"`);
      }
    } catch (error) {
      return emitClientError(this.client, new FrameworkError('ComponentLoadError', this.label, error, filepath));
    }
    this.onWatchedChange(previous, this.collection.find(c => c.filepath === filepath));
  }

  private remove(component: T) {
    clearRequireCache(component.filepath);
    this.unregister(component);
  }
}
