import { IsOptional, IsString } from 'class-validator';

export class BuscarLibroCampoDto {
  @IsOptional()
  @IsString()
  problematica_abordada?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  acuerdo_alcanzado?: string;
}