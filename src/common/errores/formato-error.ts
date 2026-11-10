// Formato uniforme de errores de la API: { statusCode, code, message } (+ "errores" en validaciones).
//   statusCode: código HTTP
//   code: código interno estable, pensado para que la app y el panel decidan qué hacer
//   message: texto en español para mostrar al usuario
//   errores: (solo en validaciones) la lista de problemas encontrados, uno por campo
// Un servicio puede fijar su propio code: throw new ConflictException({ code: 'X', message: '...' })

import { HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

export interface CuerpoError {
  statusCode: number;
  code: string;
  message: string;
  errores?: string[];
}

export const CODIGO_POR_ESTADO: Record<number, string> = {
  400: 'DATOS_INVALIDOS',
  401: 'NO_AUTENTICADO',
  403: 'SIN_PERMISO',
  404: 'NO_ENCONTRADO',
  409: 'CONFLICTO',
  413: 'PETICION_DEMASIADO_GRANDE',
  429: 'DEMASIADAS_PETICIONES',
  500: 'ERROR_INTERNO',
};

// Errores de PostgreSQL más comunes (códigos SQLSTATE)
const ERRORES_PG: Record<string, { status: number; code: string; message: string }> = {
  '23505': { status: 409, code: 'REGISTRO_DUPLICADO', message: 'Ya existe un registro con esos datos' },
  '23503': {
    status: 409,
    code: 'REGISTRO_EN_USO',
    message: 'La operación no es posible porque el registro está relacionado con otros datos',
  },
  '23514': { status: 400, code: 'DATOS_INVALIDOS', message: 'Los datos no cumplen las reglas de la base de datos' },
  '22P02': { status: 400, code: 'FORMATO_INVALIDO', message: 'Formato de dato inválido' },
  '22007': { status: 400, code: 'FECHA_INVALIDA', message: 'Fecha u hora inválida' },
  '22008': { status: 400, code: 'FECHA_INVALIDA', message: 'Fecha u hora fuera de rango' },
};

// Mensajes que NestJS, Passport o class-validator generan en inglés -> español
const TRADUCCIONES: [RegExp, string][] = [
  [/^Unauthorized$/, 'Debes iniciar sesión: el token falta, no es válido o ya venció'],
  [/^Forbidden( resource)?$/, 'No tienes permiso para realizar esta acción'],
  [/Too Many Requests/i, 'Demasiadas peticiones seguidas. Espera un minuto e intenta de nuevo'],
  [/^Validation failed \(uuid.* is expected\)$/, 'El identificador debe ser un UUID válido'],
  [/^Validation failed \(enum string is expected\)$/, 'Valor no permitido en la dirección (URL)'],
  [/^Cannot (GET|POST|PUT|PATCH|DELETE) (\S+)$/, 'No existe el recurso $1 $2'],
  [/(JSON|Unexpected token|Unexpected end)/, 'El cuerpo de la petición no es un JSON válido'],
  [/^property (\S+) should not exist$/, 'El campo "$1" no está permitido'],
  [/^(\S+) must be a UUID$/, '$1 debe ser un UUID válido'],
  [/^(\S+) must be a string$/, '$1 debe ser un texto'],
  [/^(\S+) must be a boolean value$/, '$1 debe ser verdadero o falso'],
  [/^(\S+) must be an integer number$/, '$1 debe ser un número entero'],
  [/^(\S+) must be a number.*$/, '$1 debe ser un número'],
  [/^(\S+) must be one of the following values: (.+)$/, '$1 debe ser uno de estos valores: $2'],
  [/^(\S+) must not be less than (\S+)$/, '$1 no puede ser menor que $2'],
  [/^(\S+) must not be greater than (\S+)$/, '$1 no puede ser mayor que $2'],
  [/^(\S+) should not be empty$/, '$1 es obligatorio'],
  [/^(\S+) must be an array$/, '$1 debe ser una lista'],
];

// Si el mensaje coincide con un patrón, se reemplaza COMPLETO por la traducción
// ($1, $2… toman lo capturado por el patrón, por ejemplo el nombre del campo)
export function traducir(mensaje: string): string {
  for (const [patron, texto] of TRADUCCIONES) {
    const m = mensaje.match(patron);
    if (m) return texto.replace(/\$(\d)/g, (_, i: string) => m[Number(i)] ?? '');
  }
  return mensaje;
}

export function formatearError(error: unknown): CuerpoError {
  // 1. Errores HTTP lanzados por la aplicación o por NestJS
  if (error instanceof HttpException) {
    const statusCode = error.getStatus();
    const respuesta = error.getResponse();
    const cuerpo = typeof respuesta === 'object' && respuesta !== null ? (respuesta as Record<string, unknown>) : {};
    const code =
      typeof cuerpo.code === 'string' ? cuerpo.code : (CODIGO_POR_ESTADO[statusCode] ?? `HTTP_${statusCode}`);

    // Validaciones de DTOs: lista de mensajes
    if (Array.isArray(cuerpo.message)) {
      const errores = cuerpo.message.map((m) => traducir(String(m)));
      return { statusCode, code, message: errores.join('. '), errores };
    }
    const texto =
      typeof respuesta === 'string'
        ? respuesta
        : typeof cuerpo.message === 'string'
          ? cuerpo.message
          : error.message;
    return { statusCode, code, message: traducir(texto) };
  }

  // 2. Errores de la base de datos
  if (error instanceof QueryFailedError) {
    const sqlstate = (error.driverError as { code?: string } | undefined)?.code ?? '';
    const conocido = ERRORES_PG[sqlstate];
    if (conocido) return { statusCode: conocido.status, code: conocido.code, message: conocido.message };
  }

  // 3. Cualquier otro error: nunca se muestran detalles internos al cliente
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor',
  };
}
