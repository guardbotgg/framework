import { inspect } from 'util';


const messages: Record<FrameworkErrorName, (...values: any[]) => string> = {
  NoOptions: () => `No options object was provided.`,
  InvalidOption: (name: string) => `No "${name}" option was provided.`,
  InvalidType: (name: string, expected: string, actual: string) => `Expected "${name}" to be of type "${expected}", but got "${actual}".`,
  InvalidValue: (name: string, expected: string[]) => `Expected "${name}" to be any one of the listed values: ${expected.map(v => `"${v}"`).join(' | ')}`,
  InvalidValues: (name: string, expected: string[]) => `Expected "${name}" to contain only the listed values: ${expected.map(v => `"${v}"`).join(' | ')}`,

  UnknownComponent: (type: string, id: string) => `Encountered an error as there is no "${type}" loaded with the id "${id}".`,
  ComponentLoadError: (type: string, error: Error) => `Encountered an error while loading the "${type}": \n${inspect(error)}`,
  ComponentAlreadyLoaded: (type: string, id: string) => `Encountered an error as a "${type}" with the id "${id}" is already loaded.`,

  AppCommandRegister: (error: Error, guildId?: string) => `Encountered an error while registering commands ${guildId ? `to guild "${guildId}"` : ''}: \n${inspect(error)}`,
}


class FrameworkError extends Error {
  constructor(id: FrameworkErrorName, ...values: any[]) {
    const message = messages[id](...values);
    super(message);
    this.name = `Error [ ${id} ]`;
  }
}

class FrameworkTypeError extends TypeError {
  constructor(id: FrameworkErrorName, ...values: string[]) {
    const message = messages[id](...values);
    super(message);
    this.name = `TypeError [ ${id} ]`;
  }
}


type FrameworkErrorName = (
  'NoOptions' | 'InvalidOption' | 'InvalidType' | 'InvalidValue' | 'InvalidValues' |
  'UnknownComponent' | 'ComponentLoadError' | 'ComponentAlreadyLoaded' |
  'AppCommandRegister'
)

export {
  FrameworkError,
  FrameworkTypeError
}