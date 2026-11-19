export type InventarioItem = {
    id: number;
    stock: number;
    producto: {
      nombre: string;
      codigo: string;
      unidadMedida: UnidadMedida;
      archivado: boolean;
    };
};

export type UnidadMedida = {
    nombre: string;
    abreviatura: string;
}