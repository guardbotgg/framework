import { ComponentEvents, ComponentIdleOptions, ComponentInteraction, ComponentType, FrameworkComponent, RegisteredClient } from '../types';
import { emitClientError, replyWithError, passesCooldown, passesGuildCheck, passesMiddleware } from '../utils';
import { validateIdleOptions } from '../builders/components/Component';
import { Interaction, RepliableInteraction } from 'discord.js';
import { FrameworkClient } from '../core/FrameworkClient';
import BaseModule from './BaseModule';


const INTERACTION_TOKEN_LIFETIME_MS = 15 * 60_000;

export default class ComponentsModule extends BaseModule<FrameworkComponent, ComponentEvents> {
  protected readonly label = 'component';
  private idleTimers = new Map<string, NodeJS.Timeout>();

  protected get directory() { return this.client.componentsDir; }
  public get collection() { return this.client.components; }

  constructor(client: FrameworkClient) {
    super(client);
    this.client.on('interactionCreate', (interaction) =>
      this.handleInteraction(interaction).catch(error => emitClientError(this.client, error))
    );
  }

  match(type: ComponentType, customId: string): { component: FrameworkComponent; match: RegExpExecArray | null } | null {
    let regexMatch: { component: FrameworkComponent; match: RegExpExecArray } | null = null;

    for (const component of this.collection.values()) {
      if (component.disabled || !component.types.includes(type)) continue;
      if (typeof component.customId === 'string') {
        if (component.customId === customId) return { component, match: null };
      } else if (!regexMatch) {
        const match = component.customId.exec(customId);
        if (match) regexMatch = { component, match };
      }
    }
    return regexMatch;
  }

  trackIdle(messageId: string, interaction: RepliableInteraction, idle: ComponentIdleOptions) {
    validateIdleOptions(idle);
    this.startIdleTimer(messageId, interaction, idle);
  }

  cancelIdle(messageId: string) {
    clearTimeout(this.idleTimers.get(messageId));
    this.idleTimers.delete(messageId);
  }

  override dispose() {
    super.dispose();
    this.idleTimers.forEach(timer => clearTimeout(timer));
    this.idleTimers.clear();
  }


  protected override register(component: FrameworkComponent) {
    super.register(component);
    if (this.collection.some(c => c.filepath > component.filepath)) this.collection.sort(compareFilepaths);
  }

  private async handleInteraction(interaction: Interaction) {
    const type = getComponentType(interaction);
    if (!type) return;

    const componentInteraction = interaction as ComponentInteraction;
    const result = this.match(type, componentInteraction.customId);
    if (!result) return this.emitSafely('unknown', componentInteraction);

    const { component, match } = result;
    if (!(await passesGuildCheck(this.client, componentInteraction, component, component.guildOnly))) return;
    if (!(await passesMiddleware(this.client, componentInteraction, component))) return;

    const { message } = componentInteraction;
    const { idle } = component;

    if (idle && message && !this.idleTimers.has(message.id) && Date.now() - (message.editedTimestamp ?? message.createdTimestamp) > idle.timeout) {
      return this.closeIdle(message.id, componentInteraction, idle);
    }

    if (!(await passesCooldown(this.client, componentInteraction, component, componentInteraction.user.id))) return;
    if (idle && message) this.startIdleTimer(message.id, componentInteraction, idle);

    await this.runHandler(
      { component, interaction: componentInteraction },
      () => component.execute(this.client as RegisteredClient, componentInteraction as never, match),
      (error) => replyWithError(this.client, componentInteraction, error, component),
    );
  }

  private startIdleTimer(messageId: string, interaction: RepliableInteraction, idle: ComponentIdleOptions) {
    this.cancelIdle(messageId);
    const timer = setTimeout(() => {
      this.idleTimers.delete(messageId);
      if (Date.now() - interaction.createdTimestamp >= INTERACTION_TOKEN_LIFETIME_MS) return;
      Promise.resolve()
        .then(() => idle.onIdle(interaction))
        .catch(error => emitClientError(this.client, error));
    }, idle.timeout);

    this.idleTimers.set(messageId, timer.unref());
  }

  private async closeIdle(messageId: string, interaction: ComponentInteraction, idle: ComponentIdleOptions) {
    this.cancelIdle(messageId);
    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
    await idle.onIdle(interaction);
  }
}


function getComponentType(interaction: Interaction): ComponentType | null {
  if (interaction.isButton()) return 'Button';
  if (interaction.isAnySelectMenu()) return 'SelectMenu';
  if (interaction.isModalSubmit()) return 'ModalSubmit';
  return null;
}

function compareFilepaths(a: FrameworkComponent, b: FrameworkComponent) {
  return a.filepath < b.filepath ? -1 : a.filepath > b.filepath ? 1 : 0;
}
