import { isURL, registerDecorator, ValidationOptions } from 'class-validator';
import { esRutaLocal } from '../archivos/uploads.js';

// Foto de un embarcadero: una URL completa (https://…) pegada por el administrador
// o la ruta relativa de una foto subida a la API (/uploads/<uuid>.webp).
export function IsFotoUrl(opciones?: ValidationOptions) {
  return (objeto: object, propiedad: string) =>
    registerDecorator({
      name: 'isFotoUrl',
      target: objeto.constructor,
      propertyName: propiedad,
      options: {
        message: `${propiedad} debe ser una URL completa (https://…) o una foto subida (/uploads/…)`,
        ...opciones,
      },
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' &&
          (esRutaLocal(valor) || isURL(valor, { require_protocol: true })),
      },
    });
}
