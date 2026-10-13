const KIND = Symbol.for('@guardbot/framework.kind');

export type ComponentKind = 'command' | 'listener' | 'autocompleter' | 'component';

export const COMPONENT_EXPORTS: Readonly<Record<ComponentKind, string>> = {
  command: 'command',
  listener: 'listener',
  autocompleter: 'autocomplete',
  component: 'component',
};

export function withKind<T extends object>(kind: ComponentKind, value: T): T {
  return Object.assign(value, { [KIND]: kind });
}

export function kindOf(value: unknown): ComponentKind | undefined {
  return typeof value === 'object' && value !== null ? Reflect.get(value, KIND) : undefined;
}
