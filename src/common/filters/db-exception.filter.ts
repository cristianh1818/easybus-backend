import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

// Traduce los errores de PostgreSQL a respuestas HTTP claras,
// con el mismo formato que los demás errores de la API.
const ERRORES_PG: Record<string, { status: number; mensaje: string }> = {
  '23505': { status: HttpStatus.CONFLICT, mensaje: 'Ya existe un registro con esos datos' },
  '23503': {
    status: HttpStatus.CONFLICT,
    mensaje: 'La operación no es posible porque el registro está relacionado con otros datos',
  },
  '22P02': { status: HttpStatus.BAD_REQUEST, mensaje: 'Formato de dato inválido' },
  '22007': { status: HttpStatus.BAD_REQUEST, mensaje: 'Fecha u hora inválida' },
  '22008': { status: HttpStatus.BAD_REQUEST, mensaje: 'Fecha u hora fuera de rango' },
};

@Catch(QueryFailedError)
export class DbExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('BaseDeDatos');

  catch(error: QueryFailedError, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const codigo = (error.driverError as { code?: string } | undefined)?.code ?? '';
    const conocido = ERRORES_PG[codigo];

    if (!conocido) this.logger.error(error.message);

    const status = conocido?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    respuesta.status(status).json({
      statusCode: status,
      error: conocido ? 'DatabaseConstraint' : 'InternalServerError',
      codigo: codigo || undefined,
      message: conocido?.mensaje ?? 'Error interno del servidor',
    });
  }
}
