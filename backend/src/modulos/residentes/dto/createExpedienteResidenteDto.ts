// create-expediente-completo.dto.ts
import { IsNotEmpty, IsEmail, IsEnum, IsDateString, IsOptional, IsNumber, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { Sexo } from 'src/common/enums/rol.enum';
import { IsAdultoMayor } from 'src/common/validators/is-adulto-mayor.validator';
import { FechaIngresoResidenteValida } from 'src/common/validators/fecha-ingreso-residente.validator';
import { NormalizeName } from 'src/common/decorators/normalize-name.decorator';


export class CreateEncargadoDto {
  @IsNotEmpty()
  @NormalizeName()
  nombre: string;

  @IsNotEmpty()
  cedula: string;

  @IsNotEmpty()
  @NormalizeName()
  apellido1: string;

  @IsOptional()
  @NormalizeName()
  apellido2?: string;

  @IsNotEmpty()
  telefono: string;

  @IsEmail()
  correo: string;
}

export class CreateResidenteDto {
  @IsNotEmpty()
  cedula: string;

  @IsNotEmpty()
  @NormalizeName()
  nombre: string;

  @IsNotEmpty()
  @NormalizeName()
  apellido1: string;

  @IsOptional()
  @NormalizeName()
  apellido2?: string;

  @IsEmail()
  email: string;

  @IsEnum(Sexo)
  sexo: Sexo;

  @IsDateString()
  @IsAdultoMayor()
  fecha_nacimiento: Date;

  @IsNumber()
  edad: number;

  @IsNumber()
  estado_civil: number;

  @IsNotEmpty()
  dependencia: number;

  @IsNotEmpty()
  lineaPobreza: number;

  @ValidateNested({ each: true })
  @Type(() => CreateEncargadoDto)
  @ArrayMinSize(1)
  encargados: CreateEncargadoDto[];
}

@FechaIngresoResidenteValida()
export class  CreateExpedienteCompletoDto {
  @IsNotEmpty()
  tipo_pension: number;

  @IsDateString()
  fecha_ingreso: Date;

  @ValidateNested()
  @Type(() => CreateResidenteDto)
  residente: CreateResidenteDto;
}
