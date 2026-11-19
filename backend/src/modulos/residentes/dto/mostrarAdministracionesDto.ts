import { Expose, Type } from "class-transformer";
import { MostrarAdministracionMedicamentoDto } from "./MostrarAdministracionMedicamentoDto";



export class MostrarAdministracionesDto{

    @Expose()
    id_administracion: number;

    @Expose()
    turno: string

    @Expose()
    @Type(() => MostrarAdministracionMedicamentoDto)
    medicamentos: MostrarAdministracionMedicamentoDto;

}