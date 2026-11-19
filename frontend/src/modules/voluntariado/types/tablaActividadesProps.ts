import type { EditarActividades } from "../models/accionesExpediente";
import type { Actividades } from "../models/voluntario";

export type TablaActividadesProps = {
    actividades?: Actividades[];
}

export type EditarActividadesProps = {
    actividad: EditarActividades;
    onClose:() => void ;

}
