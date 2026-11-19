import { Expose } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class HorarioPendienteDto {
  @IsNotEmpty()
  @Expose()
  id: number 
  
  @IsString()
  @IsNotEmpty()
  @Expose()
  dia: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  horaInicio: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  horaFin: string;
}