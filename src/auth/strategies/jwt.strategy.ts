import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../../usuarios/usuarios.service.js';
import type { JwtPayload, UsuarioActual } from '../interfaces/usuario-token.interface.js';

// Lee el token de la cabecera "Authorization: Bearer <token>", verifica su firma
// y su vigencia, y deja el usuario en request.user
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usuarios: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioActual> {
    // Se consulta la BD para que un usuario desactivado pierda el acceso de inmediato
    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no válido o desactivado');
    }
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };
  }
}
