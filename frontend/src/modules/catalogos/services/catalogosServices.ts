import sidnamAPI from "@/api/apiConfig";
import { CATALOGOS, type CatalogoKey } from "../catalogosConfig";
import type { ItemCatalogo } from "../models/catalogos";

// soloActivos=false requiere Catalogos:Ver; el listado de activos lo puede pedir cualquier sesión.
export const getCatalogo = async (catalogo: CatalogoKey, soloActivos: boolean): Promise<ItemCatalogo[]> =>
  (await sidnamAPI.get<ItemCatalogo[]>(CATALOGOS[catalogo].ruta, { params: { soloActivos } })).data;

export const postItemCatalogo = async ({ catalogo, nombre }: { catalogo: CatalogoKey; nombre: string }): Promise<ItemCatalogo> =>
  (await sidnamAPI.post<ItemCatalogo>(CATALOGOS[catalogo].ruta, { nombre })).data;

export const patchEstadoItemCatalogo = async ({ catalogo, id, activar }: { catalogo: CatalogoKey; id: number; activar: boolean }): Promise<ItemCatalogo> =>
  (await sidnamAPI.patch<ItemCatalogo>(`${CATALOGOS[catalogo].ruta}/${id}/${activar ? 'reactivar' : 'desactivar'}`)).data;
