import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { formatearError } from './formato-error.js';

// Filtro global: todas las respuestas de error salen con el mismo formato
// { statusCode, code, message } (ver formato-error.ts). Los errores 500 se registran
// en la consola con todo el detalle, pero al cliente solo le llega un mensaje genérico.
@Catch()
export class ErroresFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(error: unknown, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const cuerpo = formatearError(error);
    if (cuerpo.statusCode >= 500) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
    respuesta.status(cuerpo.statusCode).json(cuerpo);
  }
}
