import sidnamAPI from "@/api/apiConfig";
import type { Sede } from "@/store/sedeStore";
import type {
  CrearExistenciaPorCodigo, CrearExistenciaPorId, CrearExistenciaResp, Existencia, ExistenciasResp,
  MovimientoCreado, MovimientoExistencia, ProductoCatalogo,
} from "../models/existencia";
import type { Categoria } from "../models/inventario";

export const getCategoriasSede = async (sede: Sede): Promise<Categoria[]> =>
  (await sidnamAPI.get<Categoria[]>('/inventario/categorias', { params: { sede } })).data;

export const getExistencias = async (p: {
  sede: Sede; categoria?: number; archivado?: boolean; page?: number; limit?: number;
}): Promise<ExistenciasResp> =>
  (await sidnamAPI.get<ExistenciasResp>('/inventario', { params: p })).data;

export const getExistenciaDetalle = async (id: number) =>
  (await sidnamAPI.get<Existencia & { producto: { categoriaTipo?: string; imagenUrl?: string; subcategoriaId?: number } & Existencia['producto'] }>(`/inventario/${id}`)).data;

export const getProductosCatalogo = async (): Promise<ProductoCatalogo[]> =>
  (await sidnamAPI.get<ProductoCatalogo[]>('/inventario/productos')).data;

export const postExistencia = async (body: CrearExistenciaPorId | CrearExistenciaPorCodigo): Promise<CrearExistenciaResp> =>
  (await sidnamAPI.post<CrearExistenciaResp>('/inventario', body)).data;

export const patchArchivarExistencia = async ({ id, archivado }: { id: number; archivado: boolean }) =>
  (await sidnamAPI.patch<{ id: number; sede: Sede; archivado: boolean }>(`/inventario/${id}/archivar`, { archivado })).data;

export const getMovimientos = async (tipo: 'entradas' | 'salidas', inventarioId: number, mes?: string) =>
  (await sidnamAPI.get<MovimientoExistencia[]>(`/inventario/${inventarioId}/${tipo}`, { params: mes ? { mes } : {} })).data;

export const postMovimiento = async ({ tipo, inventarioId, cantidad, fecha }: {
  tipo: 'entradas' | 'salidas'; inventarioId: number; cantidad: number; fecha: string;
}) =>
  (await sidnamAPI.post<MovimientoCreado>(`/inventario/${inventarioId}/${tipo}`, {
    cantidad,
    [tipo === 'entradas' ? 'fechaEntrada' : 'fechaSalida']: fecha,
  })).data;
