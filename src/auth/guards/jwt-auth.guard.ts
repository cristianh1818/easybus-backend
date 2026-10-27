import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Exige un token JWT válido. Sin token o con token vencido responde 401.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
