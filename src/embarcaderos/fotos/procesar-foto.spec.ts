import sharp from 'sharp';
import { procesarFoto } from './procesar-foto.js';

describe('procesarFoto', () => {
  it('reduce a 1280 px, convierte a WEBP y quita el EXIF (GPS)', async () => {
    // JPG de 3000x2000 con EXIF que incluye coordenadas GPS
    const jpg = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: '#2a64b8' },
    })
      .jpeg()
      .withExif({
        IFD0: { Make: 'TelefonoDePrueba' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '8/1 45/1 0/1' },
      })
      .toBuffer();
    expect((await sharp(jpg).metadata()).exif).toBeDefined();

    const meta = await sharp(await procesarFoto(jpg)).metadata();

    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1280);
    expect(meta.height).toBe(853);
    expect(meta.exif).toBeUndefined();
  });

  it('rechaza un archivo que no es imagen aunque se llame .jpg', async () => {
    const falso = Buffer.from('<?php echo "no soy una foto"; ?>');
    await expect(procesarFoto(falso)).rejects.toMatchObject({
      response: { code: 'FOTO_INVALIDA' },
    });
  });
});
