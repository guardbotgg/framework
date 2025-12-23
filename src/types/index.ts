import { AutocompleteInteraction, ClientOptions, Collection, InteractionCollectorOptions, Message as DiscordMessage, MessageCollectorOptions, ModalSubmitInteraction } from 'discord.js';
import { FrameworkCommand, FrameworkSlashCommand } from './commands';
import AutocompleteModule from '../autocomplete/AutocompleteModule';
import ListenerModule from '../listeners/ListenersModule';
import CommandsModule from '../commands/CommandsModule';
import FrameworkClient from '../FrameworkClient';
import { FrameworkListener } from './listeners';


interface FrameworkClientOptions {
  clientOptions: ClientOptions;
  rootDir?: string;
  developers?: string[];
  prefix?: string;
  registerOnStart?: boolean;
  guildsToRegister?: string[];
}

interface AutocompleterOptions {
  /** Name of the Autocompleter. */
  name: string;
  /** Whether the Autocompleter is disabled. */
  disabled?: boolean;
  /** Handle the execution of the Autocompleter. */
  execute: (client: FrameworkClient<true>, interaction: AutocompleteInteraction, command: FrameworkSlashCommand, value: string) => Promise<unknown>;
}

interface FrameworkAutocompleter {
  id: string;
  filepath: string;
  name: string;
  disabled: boolean;
  execute: (client: FrameworkClient<true>, interaction: AutocompleteInteraction, command: FrameworkSlashCommand, value: string) => Promise<unknown>;
}

type ModalCollectorOptions = InteractionCollectorOptions<ModalSubmitInteraction>;
interface AwaitMemberResponseOptions extends MessageCollectorOptions {
  deleteMessage?: boolean;
}


export * from './commands';
export * from './listeners';
export {
  FrameworkClientOptions,
  AutocompleterOptions,
  FrameworkAutocompleter,
  ModalCollectorOptions,
  AwaitMemberResponseOptions,
};


declare module 'discord.js' {
  interface ClientEvents {
    buttonInteraction: [interaction: ButtonInteraction];
    selectMenuInteraction: [interaction: AnySelectMenuInteraction];
    modalSubmitInteraction: [interaction: ModalSubmitInteraction];
  }
  interface Client {
    prefix: string;
    developers: string[];
    autocomplete: Collection<string, FrameworkAutocompleter>;
    aliases: Collection<string, string>;
    commands: Collection<string, FrameworkCommand>;
    cooldowns: Collection<string, Collection<string, number>>;
    events: Collection<string, FrameworkListener<keyof ClientEvents>>;
    autocompleteModule: AutocompleteModule;
    commandsModule: CommandsModule;
    listenerModule: ListenerModule;
  }
  interface Message {
    prefix: string;
    isDeveloper(): boolean;
    awaitMemberResponse(options?: AwaitMemberResponseOptions): Promise<DiscordMessage>;
    createModalSubmitCollector(options?: ModalCollectorOptions): InteractionCollector<ModalSubmitInteraction>;
    awaitModalSubmitComponent(options?: ModalCollectorOptions): Promise<ModalSubmitInteraction>;
  }
}