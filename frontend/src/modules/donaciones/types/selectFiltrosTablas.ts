interface EstadoSolicitud {
    id: number;
    nombre: string;
}

export type SelectFiltrosTablaProps = {
  value?: string;
  onClickAction: (val: string) => void;
  placeholder?: string;
  includeTodasOption?: boolean;
  opciones: EstadoSolicitud[];
};
