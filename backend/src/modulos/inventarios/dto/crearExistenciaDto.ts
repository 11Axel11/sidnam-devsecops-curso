import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SedeEnum } from 'src/common/enums/sede.enum';

// Datos para "buscar o crear" un producto por `codigo`. Si el código ya
// existe en el catálogo compartido, GANA el producto existente: estos datos
// se ignoran y se devuelve el que quedó (nombre/categoría/etc. de la base).
export class ProductoNuevoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsInt()
  @Min(1)
  categoriaId: number;

  @IsOptional()
  @IsInt()
  subcategoriaId?: number;

  @IsOptional()
  @IsString()
  imagen_url?: string;
}

// POST /inventario — crea la existencia (Inventario) de un producto en una
// sede. Exactamente UNA de estas dos formas de indicar el producto:
//   - `productoId`: producto que ya existe en el catálogo.
//   - `producto`: se busca por `codigo`; si no existe se crea en la misma
//     transacción, y si existe se reutiliza (sin duplicar nunca).
export class CrearExistenciaDto {
  @IsOptional()
  @IsInt()
  productoId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductoNuevoDto)
  producto?: ProductoNuevoDto;

  // La unidad de medida es POR EXISTENCIA (puede variar entre sedes). Es
  // opcional solo cuando el producto ya tiene alguna existencia: entonces
  // hereda la de la primera. Para un producto nuevo es obligatoria.
  @IsOptional()
  @IsInt()
  unidadMedidaId?: number;

  @IsNotEmpty()
  @IsEnum(SedeEnum, { message: 'sede debe ser hogar o cecuidam' })
  sede: SedeEnum;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'stockInicial no puede ser negativo' })
  stockInicial?: number;
}
