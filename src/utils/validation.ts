import { FrameworkError, FrameworkTypeError } from '../core/FrameworkError';
import { PermissionResolvable, PermissionsBitField } from 'discord.js';

type PrimitiveType = 'string' | 'number' | 'boolean' | 'function' | 'object';
export const MAX_TIMEOUT = 2 ** 31 - 1;


export function validateOptions(options: unknown): asserts options is object {
  if (!options) throw new FrameworkError('NoOptions');
  if (typeof options !== 'object') throw new FrameworkTypeError('InvalidType', 'options', 'object', typeof options);
}

export function validateRequired(value: unknown, name: string) {
  if (value === undefined || value === null || value === '') throw new FrameworkError('InvalidOption', name);
}

export function validateType(value: unknown, name: string, type: PrimitiveType) {
  if (value !== undefined && typeof value !== type) throw new FrameworkTypeError('InvalidType', name, type, typeof value);
}

export function validateOneOf(value: unknown, name: string, allowed: readonly unknown[]) {
  if (!allowed.includes(value)) throw new FrameworkError('InvalidValue', name, allowed);
}

export function validateDuration(value: unknown, name: string, { min = 0, max = Infinity }: { min?: number; max?: number } = {}) {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    const range = max === Infinity ? `>= ${min}` : `${min} - ${max}`;
    throw new FrameworkTypeError('InvalidType', name, `number (${range})`, typeof value === 'number' ? String(value) : typeof value);
  }
}

export function validateArray(value: unknown, name: string, of: { allowed: readonly unknown[] } | { type: PrimitiveType }) {
  if (value === undefined) return;
  if ('type' in of) {
    if (!Array.isArray(value)) throw new FrameworkTypeError('InvalidType', name, `${of.type}[]`, typeof value);
    const index = value.findIndex(v => typeof v !== of.type);
    if (index !== -1) throw new FrameworkTypeError('InvalidType', `${name}[${index}]`, of.type, typeof value[index]);
    return;
  }
  if (!Array.isArray(value)) throw new FrameworkTypeError('InvalidType', name, 'Array', typeof value);
  if (value.some(v => !of.allowed.includes(v))) throw new FrameworkError('InvalidValues', name, of.allowed);
}

export function isPermissionResolvable(value: unknown): value is PermissionResolvable {
  try {
    PermissionsBitField.resolve(value as PermissionResolvable);
    return true;
  } catch {
    return false;
  }
}
