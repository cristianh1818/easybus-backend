import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { Rol } from '../../common/enums.js';
import type { UsuarioActual } from '../interfaces/usuario-token.interface.js';

// Revisa en el servidor que el rol del usuario esté entre los permitidos (RNF-06).
// Se ejecuta DESPUÉS de JwtAuthGuard, cuando ya se sabe quién es el usuario.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Si el endpoint no exige un rol concreto, basta con estar autenticado
    if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

    const usuario = context.switchToHttp().getRequest<{ user?: UsuarioActual }>().user;
    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }
    return true;
  }
}
