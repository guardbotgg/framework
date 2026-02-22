import { Collection, InteractionCollectorOptions, Message as DiscordMessage, MessageCollectorOptions, ModalSubmitInteraction } from 'discord.js';
import { FrameworkAutocompleter } from "./autocompleters";
import { FrameworkListener } from "./listeners";
import { FrameworkCommand } from "./commands";
import AutocompleteModule from '../modules/AutocompletersModule';
import ListenersModule from '../modules/ListenersModule';
import CommandsModule from '../modules/CommandsModule';


export type TimestampTypes = 'f'|'F'|'d'|'D'|'t'|'T'|'R';
export type ModalCollectorOptions = InteractionCollectorOptions<ModalSubmitInteraction>;
export interface AwaitMemberResponseOptions extends MessageCollectorOptions {
  deleteMessage?: boolean;
}


declare module 'discord.js' {
  interface ClientEvents {
    buttonInteraction: [interaction: ButtonInteraction];
    selectMenuInteraction: [interaction: AnySelectMenuInteraction];
    modalSubmitInteraction: [interaction: ModalSubmitInteraction];
  }
  interface Client {
    prefix: string;
    developers: readonly string[];
    aliases: Collection<string, string>;
    commands: Collection<string, FrameworkCommand>;
    cooldowns: Collection<string, Collection<string, number>>;
    events: Collection<string, FrameworkListener<keyof ClientEvents>>;
    autocompleters: Collection<string, FrameworkAutocompleter>;
    commandsModule: CommandsModule;
    listenersModule: ListenersModule;
    autocompletersModule: AutocompleteModule;
  }
  interface Message {
    prefix: string;
    isDeveloper(): boolean;
    awaitMemberResponse(options?: AwaitMemberResponseOptions): Promise<DiscordMessage>;
    createModalSubmitCollector(options?: ModalCollectorOptions): InteractionCollector<ModalSubmitInteraction>;
    awaitModalSubmitComponent(options?: ModalCollectorOptions): Promise<ModalSubmitInteraction>;
  }
}