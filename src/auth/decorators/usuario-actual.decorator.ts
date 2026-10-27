import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioActual as UsuarioActualData } from '../interfaces/usuario-token.interface.js';

// Permite recibir el usuario autenticado como parámetro: metodo(@UsuarioActual() u)
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioActualData | undefined =>
    ctx.switchToHttp().getRequest<{ user?: UsuarioActualData }>().user,
);
