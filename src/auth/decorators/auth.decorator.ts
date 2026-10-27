import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from './roles.decorator.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Rol } from '../../common/enums.js';

// Atajo: @Auth(Rol.ADMINISTRADOR) protege un controlador o endpoint en una sola línea.
// @Auth() sin roles solo exige estar autenticado.
export function Auth(...roles: Rol[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' }),
    ApiForbiddenResponse({ description: 'El rol no tiene permiso' }),
  );
}
