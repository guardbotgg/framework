import FrameworkClient from '../FrameworkClient';
import { FrameworkError } from '../utils/errors';
import { FrameworkListener } from '../types';
import { listFiles } from '../utils/utils';
import { pathToFileURL } from 'node:url';
import path from 'path';


export default class ListenerModule {
  private client: FrameworkClient<true>;
  constructor(client: FrameworkClient) {
    this.client = client as FrameworkClient<true>;
  }

  async load(filepath: string, reload: boolean = false) {
    const listenerModule = reload ? require(filepath) : await import(pathToFileURL(filepath).href);
    const listener: FrameworkListener = listenerModule.listener ?? listenerModule.default?.default ?? listenerModule.default ?? listenerModule;

    if (typeof listener !== 'object' || !listener.name || listener.disabled) return false;
    if (!reload && this.client.events.has(listener.id)) throw new FrameworkError('ComponentAlreadyLoaded', 'listener', listener.id);

    listener.filepath = filepath;
    listener._execute = (...args) => listener.execute(...args);
    
    this.client[listener.once ? 'once' : 'on'](listener.name, listener._execute);
    this.client.events.set(listener.id, listener);
    return true;
  }

  async loadAll() {
    const listenerDirs = path.resolve(this.client.rootDir, 'listeners');
    const files = await listFiles(listenerDirs);

    for (const file of files) {
      try {
        await this.load(path.resolve(file));
      } catch (error) {
        this.client.emit('error', new FrameworkError('ComponentLoadError', 'listener', error));
      }
    }
  }

  async reload(id: string) {
    if (!this.client.events.has(id)) throw new FrameworkError('UnknownComponent', 'listener', id);
    const listener = this.client.events.get(id)!;

    this.unload(id, true);
    await this.load(listener.filepath, true);
  }

  private unload(id: string, reload: boolean = false) {
    if (!this.client.events.has(id)) throw new FrameworkError('UnknownComponent', 'listener', id);
    const listener = this.client.events.get(id)!;

    if (listener._execute) this.client.off(listener.name, listener._execute);
    delete require.cache[require.resolve(listener.filepath)];
    if (!reload) this.client.events.delete(id);
  }
}