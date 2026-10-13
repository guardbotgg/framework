/** A class to extend, like a discord.js structure */
export interface ExtendableStructure<T extends object = object> {
  prototype: T;
  name?: string;
}

export interface ExtensionOptions {
  /** Whether to replace members that already exist (defaults to `false`) */
  override?: boolean;
}

export interface FrameworkExtension<S extends object = object, M extends object = object> {
  structure: ExtendableStructure<S>;
  members: M;
  /** Names of the members that were added */
  keys: PropertyKey[];
}

/**
 * The members an extension adds, for merging into the class type
 *
 * @example
 * declare module 'discord.js' {
 *   interface Guild extends ExtensionMembers<typeof GuildExtension> {}
 * }
 */
export type ExtensionMembers<E> = E extends { members: infer M } ? M : never;
