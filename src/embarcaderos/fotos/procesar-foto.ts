import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024; // 5 MB
export const LADO_MAXIMO_FOTO = 1280; // px
const FORMATOS_PERMITIDOS = new Set(['jpeg', 'png', 'webp']);
// Evita "bombas" de descompresión: imágenes pequeñas en bytes pero gigantes en píxeles
const PIXELES_MAXIMOS = 50_000_000;

const fotoInvalida = () =>
  new BadRequestException({
    code: 'FOTO_INVALIDA',
    message: 'El archivo no es una imagen JPG, PNG o WEBP válida',
  });

// Valida el tipo REAL de la imagen (leyendo su contenido, no la extensión ni el
// Content-Type que manda el navegador), la gira según su orientación, la reduce a
// máximo 1280 px por lado y la convierte a WEBP.
// sharp no copia los metadatos al archivo nuevo, así se eliminan los EXIF
// (que pueden traer la ubicación GPS de quien tomó la foto).
export async function procesarFoto(datos: Buffer): Promise<Buffer> {
  const opciones = { limitInputPixels: PIXELES_MAXIMOS, failOn: 'error' as const };
  let formato: string | undefined;
  try {
    formato = (await sharp(datos, opciones).metadata()).format;
  } catch {
    throw fotoInvalida();
  }
  if (!formato || !FORMATOS_PERMITIDOS.has(formato)) throw fotoInvalida();

  try {
    return await sharp(datos, opciones)
      .rotate() // aplica la orientación EXIF antes de descartarla
      .resize({
        width: LADO_MAXIMO_FOTO,
        height: LADO_MAXIMO_FOTO,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw fotoInvalida();
  }
}
