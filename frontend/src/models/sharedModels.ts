export interface EstadoTipo {
  id: number;
  nombre: string;
}
// generico para estados o tipos

export interface TipoUnidadMedida {
  id: number;
  nombre: string;
}

export interface UnidadMedida {
  nombre: string;
  abreviatura: string;
}

export interface UnidadMedidaId {
  id_unidad: number;
  nombre: string;
  abreviatura: string;
}