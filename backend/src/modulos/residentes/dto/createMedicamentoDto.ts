import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMedicamentoDto {
    @IsNotEmpty()
    id?: number;

    @IsString()
    @IsNotEmpty()
    nombre!: string;
}