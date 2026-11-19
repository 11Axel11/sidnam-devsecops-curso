import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ContactoEmergenciaPendienteDto {
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;
}