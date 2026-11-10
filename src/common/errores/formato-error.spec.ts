import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { formatearError, traducir } from './formato-error.js';

const errorPg = (code: string) => new QueryFailedError('SELECT 1', [], Object.assign(new Error('pg'), { code }));

describe('formatearError', () => {
  it('siempre trae statusCode, code y message', () => {
    const r = formatearError(new NotFoundException('Ruta no encontrada'));
    expect(r).toEqual({ statusCode: 404, code: 'NO_ENCONTRADO', message: 'Ruta no encontrada' });
  });

  it('respeta el code que fija el servicio', () => {
    const r = formatearError(new ConflictException({ code: 'CODIGO_DUPLICADO', message: 'Ya existe BN-01' }));
    expect(r).toEqual({ statusCode: 409, code: 'CODIGO_DUPLICADO', message: 'Ya existe BN-01' });
  });

  it('validaciones: une los mensajes y los entrega también como lista', () => {
    const r = formatearError(new BadRequestException(['La capacidad debe ser un número entero', 'property foo should not exist']));
    expect(r.code).toBe('DATOS_INVALIDOS');
    expect(r.errores).toEqual(['La capacidad debe ser un número entero', 'El campo "foo" no está permitido']);
    expect(r.message).toBe('La capacidad debe ser un número entero. El campo "foo" no está permitido');
  });

  it('traduce los mensajes por defecto en inglés', () => {
    expect(formatearError(new UnauthorizedException()).message).toMatch(/^Debes iniciar sesión/);
    expect(formatearError(new ForbiddenException()).code).toBe('SIN_PERMISO');
    expect(formatearError(new HttpException('ThrottlerException: Too Many Requests', 429))).toMatchObject({
      code: 'DEMASIADAS_PETICIONES',
      message: expect.stringMatching(/^Demasiadas peticiones/),
    });
  });

  it('errores de PostgreSQL: duplicado y registro en uso', () => {
    expect(formatearError(errorPg('23505'))).toMatchObject({ statusCode: 409, code: 'REGISTRO_DUPLICADO' });
    expect(formatearError(errorPg('23503'))).toMatchObject({ statusCode: 409, code: 'REGISTRO_EN_USO' });
  });

  it('un error desconocido es 500 y no revela detalles internos', () => {
    const r = formatearError(new Error('connection refused at 10.0.0.5:5432'));
    expect(r).toEqual({ statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor' });
  });
});

describe('traducir', () => {
  it('UUID inválido en la URL', () => {
    expect(traducir('Validation failed (uuid is expected)')).toBe('El identificador debe ser un UUID válido');
  });
  it('ruta inexistente', () => {
    expect(traducir('Cannot GET /api/v1/nada')).toBe('No existe el recurso GET /api/v1/nada');
  });
  it('deja igual un mensaje que ya está en español', () => {
    expect(traducir('Embarcadero no encontrado')).toBe('Embarcadero no encontrado');
  });
});
