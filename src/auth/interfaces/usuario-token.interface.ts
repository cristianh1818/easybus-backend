import { Rol } from '../../common/enums.js';

// Lo que va guardado DENTRO del token JWT (no incluye la contraseña)
export interface JwtPayload {
  sub: string; // id del usuario
  correo: string;
  rol: Rol;
}

// Usuario autenticado que queda disponible en cada petición (request.user)
export interface UsuarioActual {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}
