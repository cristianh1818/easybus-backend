import { hash } from 'bcryptjs';

// Costo de bcrypt: cuántas veces se repite el cálculo del hash (más = más lento de romper).
// Lo usan la API y el script deploy/cambiar-clave-admin.sh (vía dist/usuarios/contrasena.js),
// así los dos generan el mismo tipo de hash.
export const BCRYPT_ROUNDS = 10;

export function hashContrasena(contrasena: string): Promise<string> {
  return hash(contrasena, BCRYPT_ROUNDS);
}
