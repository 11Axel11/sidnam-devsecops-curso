import { IsNotEmpty } from "class-validator";

export class autocompletadoResidenteDto{

    @IsNotEmpty()
    firstname!: string;

    @IsNotEmpty()
    lastname1!: string;

    @IsNotEmpty()
    lastname2!: string;
}