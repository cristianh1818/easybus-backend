import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Como JwtAuthGuard, pero no obliga a enviar token:
// si viene uno válido se conoce al usuario; si no, la petición sigue como anónima.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_error: unknown, usuario: TUser): TUser {
    return usuario || (null as TUser);
  }
}
