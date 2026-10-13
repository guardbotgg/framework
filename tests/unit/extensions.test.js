import { describe, it, before, after } from 'node:test';
import { createRoot, createClient } from './helpers.js';
import { Extension } from '../../build/index.js';
import assert from 'node:assert/strict';

class Thing {
  constructor(name) { this.name = name; }
  existing() { return 'original'; }
}

describe('extensions', () => {
  let root;
  before(() => { root = createRoot('extensions'); });
  after(() => root.cleanup());

  it('adds methods, getters and per-instance defaults', () => {
    Extension(Thing, {
      shout() { return this.name.toUpperCase(); },
      get loud() { return `${this.shout()}!`; },
      count: 0,
    });

    const a = new Thing('a');
    const b = new Thing('b');
    a.count++;
    assert.equal(a.shout(), 'A');
    assert.equal(b.loud, 'B!');
    assert.deepEqual([a.count, b.count], [1, 0]);
    assert.equal(Object.keys(a).includes('shout'), false);
  });

  it('refuses to replace existing members unless overriding', () => {
    assert.throws(() => Extension(Thing, { existing() { return 'new'; } }), (error) => error.code === 'ExtensionConflict');
    assert.throws(() => Extension(Thing, { toString() { return ''; } }), (error) => error.code === 'ExtensionConflict');
    assert.equal(new Thing('x').existing(), 'original');

    Extension(Thing, { existing() { return 'new'; } }, { override: true });
    assert.equal(new Thing('x').existing(), 'new');
  });

  it('can re-apply its own members (e.g. when a file is imported again)', () => {
    Extension(Thing, { shout() { return 'again'; } });
    assert.equal(new Thing('x').shout(), 'again');
  });

  it('rejects object defaults, without applying anything', () => {
    assert.throws(() => Extension(Thing, { fine() {}, list: [] }), (error) => error.code === 'ExtensionDefault');
    assert.equal('fine' in Thing.prototype, false);
  });

  it('extends non-discord.js classes like String', () => {
    Extension(String, { toTitleCase() { return this.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()); } });
    assert.equal('hello wORLD'.toTitleCase(), 'Hello World');
  });

  it('loads the extensions directory before other components', async () => {
    root.write('extensions/thing.js', `
      globalThis.order = ['extension'];
      framework.Extension(framework.FrameworkClient, { extendedByFile() { return true; } });
    `);
    root.write('listeners/ready.js', `globalThis.order.push('listener'); export default framework.Listener({ name: 'custom', execute() {} });`);

    const client = createClient(root.rootDir);
    await client.init();
    assert.deepEqual(globalThis.order, ['extension', 'listener']);
    assert.equal(client.extendedByFile(), true);
  });

  it('reports extension files that fail to load', async () => {
    root.write('extensions/broken.js', `framework.Extension(framework.FrameworkClient, { login() {} });`);
    const client = createClient(root.rootDir);
    const errors = [];
    client.on('error', (error) => errors.push(error.code));
    await client.init();
    assert.deepEqual(errors, ['ComponentLoadError']);
  });
});
