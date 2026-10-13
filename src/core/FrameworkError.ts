import { inspect } from 'node:util';


const messages = {
  NoOptions: () => `No options object was provided.`,
  InvalidOption: (...names: string[]) => `No ${names.map(name => `"${name}"`).join(' or ')} option was provided.`,
  InvalidType: (name: string, expected: string, actual: string) => `Expected "${name}" to be of type "${expected}", but got "${actual}".`,
  InvalidValue: (name: string, expected: readonly unknown[]) => `Expected "${name}" to be any one of the listed values: ${expected.map(v => `"${v}"`).join(' | ')}`,
  InvalidValues: (name: string, expected: readonly unknown[]) => `Expected "${name}" to contain only the listed values: ${expected.map(v => `"${v}"`).join(' | ')}`,
  InvalidDirectory: (name: string, dir: string) => `The "${name}" directory "${dir}" does not exist.`,
  UnknownComponent: (type: string, id: string) => `Encountered an error as there is no "${type}" loaded with the id "${id}".`,
  UnknownSubcommand: (name: string, subcommands: readonly string[]) => `The "subcommands" handler "${name}" doesn't match any of the command's subcommands${subcommands.length ? `: ${subcommands.map(s => `"${s}"`).join(' | ')}` : ', as it has none'}.`,
  InvalidComponent: (type: string, filepath: string) => `Expected "${filepath}" to export a "${type}", but it doesn't export one.`,
  ComponentTypeMismatch: (expected: string, actual: string, filepath: string) => `Expected "${filepath}" to export a "${expected}", but it exports a "${actual}". Move it to the ${actual}s directory.`,
  ComponentLoadError: (type: string, error: unknown, filepath?: string) => `Encountered an error while loading the "${type}"${filepath ? ` from "${filepath}"` : ''}: \n${inspect(error)}`,
  ComponentAlreadyLoaded: (type: string, id: string) => `Encountered an error as a "${type}" with the id "${id}" is already loaded.`,
  ShardReload: (type: string, id: string, failures: string[], total: number) => `Failed to reload the "${type}" "${id}" on ${failures.length}/${total} shard(s): \n${[...new Set(failures)].join('\n')}`,
  AppCommandRegister: (error: unknown, guildIds?: string[]) => `Encountered an error while registering commands${guildIds?.length ? ` to guild(s) ${guildIds.map(id => `"${id}"`).join(', ')}` : ''}: \n${inspect(error)}`,
  ClientNotReady: (action: string) => `Cannot ${action} before the client is ready.`,
  ExtensionConflict: (structure: string, key: string) => `Cannot extend "${structure}" with "${key}" as it already exists. Pass \`{ override: true }\` to replace it.`,
  ExtensionDefault: (structure: string, key: string) => `The default value of "${structure}.${key}" must be a primitive, as objects would be shared by every instance. Use a getter instead.`,
} satisfies Record<string, (...values: never[]) => string>;


export type FrameworkErrorName = keyof typeof messages;
type MessageValues<K extends FrameworkErrorName> = Parameters<(typeof messages)[K]>;

function createMessage<K extends FrameworkErrorName>(code: K, values: MessageValues<K>) {
  return (messages[code] as (...values: unknown[]) => string)(...values);
}

function createOptions(values: readonly unknown[]): ErrorOptions | undefined {
  const cause = values.find(value => value instanceof Error);
  return cause ? { cause } : undefined;
}


export class FrameworkError<K extends FrameworkErrorName = FrameworkErrorName> extends Error {
  public readonly code: K;
  constructor(code: K, ...values: MessageValues<K>) {
    super(createMessage(code, values), createOptions(values));
    this.name = `FrameworkError [${code}]`;
    this.code = code;
  }
}

export class FrameworkTypeError<K extends FrameworkErrorName = FrameworkErrorName> extends TypeError {
  public readonly code: K;
  constructor(code: K, ...values: MessageValues<K>) {
    super(createMessage(code, values), createOptions(values));
    this.name = `FrameworkTypeError [${code}]`;
    this.code = code;
  }
}
