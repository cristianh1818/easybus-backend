import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { UsuarioActual } from './decorators/usuario-actual.decorator.js';
import type { UsuarioActual as UsuarioActualData } from './interfaces/usuario-token.interface.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/v1/auth/login -> devuelve el token JWT
  // Límite estricto contra fuerza bruta: 5 intentos por minuto por IP
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión y obtener el token JWT (RF-14)' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // POST /api/v1/auth/register -> crea una cuenta de pasajero
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Crear una cuenta de pasajero (RF-10)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // GET /api/v1/auth/me -> datos del usuario dueño del token
  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Datos del usuario dueño del token' })
  me(@UsuarioActual() usuario: UsuarioActualData) {
    return usuario;
  }
}
