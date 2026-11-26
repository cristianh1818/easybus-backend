import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export const TIPOS_FAVORITO = ['ruta', 'embarcadero'] as const;
export type TipoFavorito = (typeof TIPOS_FAVORITO)[number];

export class AgregarFavoritoDto {
  @ApiProperty({ enum: TIPOS_FAVORITO, example: 'embarcadero' })
  @IsIn(TIPOS_FAVORITO, { message: 'El tipo debe ser "ruta" o "embarcadero"' })
  tipo: TipoFavorito;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'El id no es válido' })
  id: string;
}

export class FavoritoParamsDto {
  @ApiProperty({ enum: TIPOS_FAVORITO })
  @IsIn(TIPOS_FAVORITO, { message: 'El tipo debe ser "ruta" o "embarcadero"' })
  tipo: TipoFavorito;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'El id no es válido' })
  id: string;
}
