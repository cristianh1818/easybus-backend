import { registerDecorator, ValidationOptions } from 'class-validator';

// Comprueba que el valor sea una lista de al menos 2 puntos [longitud, latitud]
// con valores dentro del rango válido (formato GeoJSON).
export function IsCoordenadasLinea(opciones?: ValidationOptions) {
  return (objeto: object, propiedad: string) =>
    registerDecorator({
      name: 'isCoordenadasLinea',
      target: objeto.constructor,
      propertyName: propiedad,
      options: {
        message:
          'coordinates debe ser una lista de al menos 2 puntos [longitud, latitud] válidos',
        ...opciones,
      },
      validator: {
        validate(valor: unknown) {
          return (
            Array.isArray(valor) &&
            valor.length >= 2 &&
            valor.every(
              (p) =>
                Array.isArray(p) &&
                p.length === 2 &&
                typeof p[0] === 'number' &&
                typeof p[1] === 'number' &&
                Math.abs(p[0]) <= 180 &&
                Math.abs(p[1]) <= 90,
            )
          );
        },
      },
    });
}
