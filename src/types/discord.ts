import { Collection, InteractionCollectorOptions, MessageCollectorOptions, ModalSubmitInteraction } from 'discord.js';
import type { MessageExtension } from '../extensions/Message';
import type AutocompletersModule from '../modules/AutocompletersModule';
import type ComponentsModule from '../modules/ComponentsModule';
import type ListenersModule from '../modules/ListenersModule';
import type CommandsModule from '../modules/CommandsModule';
import { FrameworkAutocompleter } from './autocompleters';
import { FrameworkComponent } from './components';
import { ExtensionMembers } from './extensions';
import { FrameworkListener } from './listeners';
import { FrameworkCommand } from './commands';


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
    components: Collection<string, FrameworkComponent>;
    cooldowns: Collection<string, Collection<string, number>>;
    events: Collection<string, FrameworkListener<keyof ClientEvents>>;
    autocompleters: Collection<string, FrameworkAutocompleter>;
    commandsModule: CommandsModule;
    componentsModule: ComponentsModule;
    listenersModule: ListenersModule;
    autocompletersModule: AutocompletersModule;
  }
  interface Message extends ExtensionMembers<typeof MessageExtension> {}
}
