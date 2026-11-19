import type { Sede } from "@/store/sedeStore";

export interface UnidadMedidaRef { id: number; nombre: string; abreviatura: string }

export interface Existencia {
  id: number;
  producto: { id: number; nombre: string; codigo: string } | null;
  unidadMedida: UnidadMedidaRef | null;
  sede: Sede;
  stock: number;
  archivado: boolean;
}

export interface ExistenciasResp { data: Existencia[]; total: number }

export interface ProductoCatalogo { id: number; nombre: string; codigo: string; sedes: Sede[] }

export interface CrearExistenciaPorId {
  productoId: number;
  sede: Sede;
  unidadMedidaId?: number;
  stockInicial?: number;
}

export interface CrearExistenciaPorCodigo {
  producto: { nombre: string; codigo: string; categoriaId: number; subcategoriaId?: number; imagen_url?: string };
  sede: Sede;
  unidadMedidaId: number;
  stockInicial?: number;
}

export interface CrearExistenciaResp extends Existencia { productoCreado?: boolean }

export interface MovimientoExistencia {
  id: number;
  cantidad: number;
  fechaEntrada?: string;
  fechaSalida?: string;
  fechaRegistro: string | null;
  usuarioResponsable: { id: number; nombre: string } | null;
}

export interface MovimientoFila extends MovimientoExistencia {
  inventarioId: number;
  codigo: string;
  nombre: string;
  unidad: string;
  fecha: string;
}

export interface MovimientoCreado {
  inventarioId: number;
  cantidad: number;
  stockResultante: number;
}
