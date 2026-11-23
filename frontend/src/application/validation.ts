import type { FindingContent, FindingIdentity } from '../domain/ports';
import type { Severity } from '../domain/entities';
import {
  CORRECTIVE_ACTION_MAX_BYTES, CORRECTIVE_ACTION_MIN_CHARS, DESCRIPTION_MAX_BYTES,
  MAX_U64, TITLE_MAX_BYTES, rustTrim,
} from '../domain/constraints';
import { InputValidationError } from './errors';
import type { InputField } from './errors';

export function validateId(value: bigint, field: 'id' | 'expectedNextId'): bigint {
  if (typeof value !== 'bigint' || value < 0n || value > MAX_U64) {
    throw new InputValidationError(field, 'invalidId', 'El ID debe ser un entero entre 0 y u64::MAX.');
  }
  return value;
}

export function validateAddress(value: string, field: 'audit' | 'authority'): string {
  // Validación sintáctica para UX; el adaptador valida la clave pública de 32 bytes.
  if (typeof value !== 'string' || value.length < 32 || value.length > 44
    || /[^1-9A-HJ-NP-Za-km-z]/.test(value)) {
    throw new InputValidationError(field, 'invalidAddress', 'Introduce una dirección base58 sin espacios.');
  }
  return value;
}

function text(value: string, field: InputField, maxBytes: number, minChars = 1): string {
  if (typeof value !== 'string') throw new InputValidationError(field, 'required', 'Introduce un texto válido.');
  // TextEncoder reemplaza surrogates aislados; rechazarlos evita alterar el texto al codificar.
  for (const scalar of value) {
    const code = scalar.charCodeAt(0);
    if (scalar.length === 1 && code >= 0xd800 && code <= 0xdfff) {
      throw new InputValidationError(field, 'invalidUnicode', 'El texto contiene una secuencia Unicode inválida.');
    }
  }
  const normalized = rustTrim(value);
  if (normalized.length === 0) throw new InputValidationError(field, 'required', 'Este campo es obligatorio.');
  if (new TextEncoder().encode(normalized).length > maxBytes) {
    throw new InputValidationError(field, 'tooLong', `El texto admite como máximo ${maxBytes} bytes UTF-8.`);
  }
  if ([...normalized].length < minChars) {
    throw new InputValidationError(field, 'tooShort', `Introduce al menos ${minChars} caracteres Unicode.`);
  }
  return normalized;
}

export function normalizeTitle(value: string): string { return text(value, 'title', TITLE_MAX_BYTES); }

export function normalizeCorrectiveAction(value: string): string {
  return text(value, 'correctiveAction', CORRECTIVE_ACTION_MAX_BYTES, CORRECTIVE_ACTION_MIN_CHARS);
}

function validateSeverity(value: Severity): Severity {
  if (!['low', 'medium', 'high', 'critical'].includes(value)) {
    throw new InputValidationError('severity', 'invalidSeverity', 'Selecciona una gravedad válida.');
  }
  return value;
}

export function normalizeContent(input: FindingContent): FindingContent {
  return { title: normalizeTitle(input.title), description: text(input.description, 'description', DESCRIPTION_MAX_BYTES),
    severity: validateSeverity(input.severity) };
}

export function validateIdentity(input: FindingIdentity): FindingIdentity {
  return { audit: validateAddress(input.audit, 'audit'), id: validateId(input.id, 'id') };
}
