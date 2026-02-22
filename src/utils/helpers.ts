import { APIApplicationCommandOption, ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { CommandType, CommandContext, IntegrationType, TimestampTypes, SlashOptionsInput } from '../types';


export function unixTimestamp(date: Date|number, type: TimestampTypes = 'f'): string {
  return `<t:${Math.floor(new Date(date).valueOf() / 1000)}:${type}>`
}

export function createPrefixRegex(userId: string, prefix?: string) {
  return new RegExp(`^(<@!?${userId}>${prefix ? `|${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` : ''})\\s*`);
}

export function normalizeCommandName(name: string, type: CommandType): string {
  if (type === 'ContextUser' || type === 'ContextMessage') return name;
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

export function resolveCommandContexts(contexts?: CommandContext[]) {
  return (contexts?.length 
    ? contexts.map(c => (typeof c === 'string' ? InteractionContextType[c] : c))
    : [InteractionContextType.Guild]
  );
}

export function resolveIntegrationTypes(types?: IntegrationType[]) {
  return (types?.length
    ? types.map(t => (typeof t === 'string' ? ApplicationIntegrationType[t] : t))
    : [ApplicationIntegrationType.GuildInstall]
  );
}

export function normalizeOptions(options: SlashOptionsInput | undefined): APIApplicationCommandOption[] {
  if (!options || !options?.length) return [];

  if (typeof options === 'function') {
    const built = options(new SlashCommandBuilder());
    return built.options?.map(o => o.toJSON()) ?? [];
  }

  if (Array.isArray(options)) {
    return options.map(o => ('toJSON' in o ? o.toJSON() : o));
  }

  return [];
}