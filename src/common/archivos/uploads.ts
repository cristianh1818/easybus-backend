// Archivos subidos por el administrador (fotos de embarcaderos).
// Se guardan en la carpeta UPLOADS_DIR (por defecto ./uploads, fuera de Git; en
// producción, un volumen de Docker) y se sirven en /uploads/<nombre>.
// En la base se guarda solo la ruta relativa (/uploads/<nombre>.webp), nunca una URL
// con dominio: así sigue funcionando al cambiar de servidor o de dominio.

import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const PREFIJO_UPLOADS = '/uploads';

// Solo nombres generados por la API: <uuid>.webp. Impide borrar o leer otras rutas.
const RUTA_LOCAL = /^\/uploads\/[0-9a-f-]{36}\.webp$/;

export const esRutaLocal = (ruta: string | null | undefined): ruta is string =>
  !!ruta && RUTA_LOCAL.test(ruta);

export function carpetaUploads(): string {
  const carpeta = resolve(process.env.UPLOADS_DIR || join(process.cwd(), 'uploads'));
  mkdirSync(carpeta, { recursive: true });
  return carpeta;
}

// Guarda el archivo con un nombre aleatorio y devuelve su ruta relativa
export async function guardarWebp(datos: Buffer): Promise<string> {
  const nombre = `${randomUUID()}.webp`;
  await writeFile(join(carpetaUploads(), nombre), datos, { flag: 'wx' });
  return `${PREFIJO_UPLOADS}/${nombre}`;
}

// Borra un archivo subido. Ignora rutas externas (https://…) y archivos que ya no existen.
export async function borrarSubido(ruta: string | null | undefined): Promise<void> {
  if (!esRutaLocal(ruta)) return;
  const nombre = ruta.slice(PREFIJO_UPLOADS.length + 1);
  try {
    await unlink(join(carpetaUploads(), nombre));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`No se pudo borrar ${ruta}:`, (error as Error).message);
    }
  }
}
