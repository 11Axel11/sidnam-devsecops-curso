import { Expose, Transform } from "class-transformer";

export class GetSalidasOngoingDto{

    @Expose()
    id_salida: number;

    @Expose()
    parentesco: string;

    @Expose()
    nombre_familiar: string;

    @Expose()
    apellido1_familiar: string;

    @Expose()
    apellido2_familiar: string;

    @Expose()
    @Transform(({ value }) => {
            if (!value) return null;
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date.toLocaleDateString('es-CR');
    })
    fecha_salida: string;

    @Expose()
    hora_salida: string;

    @Expose()
    @Transform(({ value }) => {
            if (!value) return null;
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date.toLocaleDateString('es-CR');
    })
    fecha_regreso: string;

    @Expose()
    hora_regreso: string;

}