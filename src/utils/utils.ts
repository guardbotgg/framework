import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType, PermissionResolvable, PermissionsBitField } from 'discord.js';
import path from 'path';
import fs from 'fs';


async function listFiles(dir: string): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];
  
  const files: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...(await listFiles(fullPath)));
    else if (item.name.endsWith('.js') || item.name.endsWith('.ts')) files.push(fullPath);
  }
  return files;
}

function isPermissionResolvable(option: any): option is PermissionResolvable {
  try {
    PermissionsBitField.resolve(option);
    return true;
  } catch {
    return false;
  }
}

function unixTimestamp(date: Date|number, type: ('f'|'F'|'d'|'D'|'t'|'T'|'R') = 'f'): string {
  return `<t:${Math.floor(new Date(date).valueOf() / 1000)}:${type}>`
}

function resolveCommandType(type: 'Slash' | 'Message' | 'ContextUser' | 'ContextMessage') {
  return type === 'Slash' ? ApplicationCommandType.ChatInput : (type === 'ContextUser' ? ApplicationCommandType.User : ApplicationCommandType.Message);
}

function resolveCommandContexts(contexts?: (InteractionContextType | keyof typeof InteractionContextType)[]) {
  return contexts?.length ? contexts.map(c => typeof c === 'string' ? InteractionContextType[c] : c) : [InteractionContextType.Guild]; 
}

function resolveIntegrationTypes(types?: (ApplicationIntegrationType | keyof typeof ApplicationIntegrationType)[]) {
  return types?.length ? types.map(c => typeof c === 'string' ? ApplicationIntegrationType[c] : c) : [ApplicationIntegrationType.GuildInstall]; 
}


export {
  listFiles,
  isPermissionResolvable,
  unixTimestamp,
  resolveCommandType,
  resolveCommandContexts,
  resolveIntegrationTypes
}