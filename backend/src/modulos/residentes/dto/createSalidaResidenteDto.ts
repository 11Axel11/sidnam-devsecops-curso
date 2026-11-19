import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSalidaResidenteDto {

  @IsNotEmpty()
  @IsString()
  parentesco!: string;

  @IsNotEmpty()
  @IsString()
  nombre_familiar!: string;

  @IsNotEmpty()
  @IsString()
  apellido1_familiar!: string;

  @IsOptional()
  @IsString()
  apellido2_familiar?: string;

  @IsNotEmpty()
  @IsDateString()
  fecha_salida!: Date;

  @IsNotEmpty()
  @IsString()
  hora_salida!: string;

  @IsNotEmpty()
  @IsDateString()
  fecha_regreso!: Date;

  @IsNotEmpty()
  @IsString()
  hora_regreso!: string;
}