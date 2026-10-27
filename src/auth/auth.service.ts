import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './interfaces/usuario-token.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuarios.buscarPorCorreoConHash(dto.correo);

    // Mismo mensaje si el correo no existe o la clave es incorrecta:
    // así no se revela qué correos están registrados
    const claveOk = usuario ? await compare(dto.password, usuario.contrasenaHash) : false;
    if (!usuario || !claveOk || !usuario.activo) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    return this.emitirToken(usuario);
  }

  // Registro público de pasajeros
  async register(dto: RegisterDto) {
    const usuario = await this.usuarios.crear(dto);
    return this.emitirToken(usuario);
  }

  private async emitirToken(usuario: Usuario) {
    const payload: JwtPayload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: Number(this.config.get('JWT_EXPIRES_IN', 3600)),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }
}
