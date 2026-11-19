import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePatologiaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}