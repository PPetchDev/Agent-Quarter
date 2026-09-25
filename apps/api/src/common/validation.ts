import { ValidationPipe, type ValidationPipeOptions } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ValidateIf, type ValidationError } from 'class-validator';

// Caps the web also enforces live in @squad/core; API-only caps stay here.
export { MAX_CHAT_MESSAGE_LENGTH, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '@squad/core';
export const MAX_ID_LENGTH = 64;
export const MAX_LIST_LENGTH = 20;
export const MAX_PROMPT_LENGTH = 8000;

/** Unknown fields are an error rather than silently stripped, and payloads become DTO instances. */
const VALIDATION_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};

export function createHttpValidationPipe(): ValidationPipe {
  return new ValidationPipe(VALIDATION_OPTIONS);
}

/** Gateways are outside the global pipe, and only a WsException reaches the socket client. */
export function createWsValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    ...VALIDATION_OPTIONS,
    exceptionFactory: (errors) => new WsException(describe(errors)),
  });
}

/**
 * Like IsOptional, but an explicit null is still validated (and rejected): services treat
 * only undefined as "not provided", so a null would otherwise reach Prisma and 500.
 */
export function IsOmittable(): PropertyDecorator {
  return ValidateIf((_object, value) => value !== undefined);
}

function describe(errors: ValidationError[]): string {
  return errors.flatMap((error) => Object.values(error.constraints ?? {})).join('; ');
}
