import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Sede } from "@/store/sedeStore";
import {
  getCategoriasSede, getExistencias, getExistenciaDetalle, getMovimientos, getProductosCatalogo,
  patchArchivarExistencia, postExistencia, postMovimiento,
} from "../services/existenciaService";
import type { MovimientoFila } from "../models/existencia";

export function useCategoriasSede(sede: Sede | undefined) {
  return useQuery({
    queryKey: ['categorias', { sede }],
    queryFn: () => getCategoriasSede(sede!),
    enabled: !!sede,
  });
}

export function useInventarioQuery(p: {
  sede: Sede | undefined; categoria?: number; archivado?: boolean; page?: number; limit?: number; enabled?: boolean;
}) {
  const { sede, categoria, archivado, page, limit, enabled = true } = p;
  return useQuery({
    queryKey: ['inventario', { sede, categoria, archivado, page, limit }],
    queryFn: () => getExistencias({ sede: sede!, categoria, archivado, page, limit }),
    enabled: !!sede && enabled,
  });
}

export function useExistenciaDetalle(id: number, enabled: boolean) {
  return useQuery({ queryKey: ['inventario', 'detalle', id], queryFn: () => getExistenciaDetalle(id), enabled });
}

export function useProductosCatalogo(enabled = true) {
  return useQuery({ queryKey: ['productosCatalogo'], queryFn: getProductosCatalogo, enabled });
}

export function usePostExistencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postExistencia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario'] });
      qc.invalidateQueries({ queryKey: ['productosCatalogo'] });
    },
  });
}

export function usePatchArchivarExistencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchArchivarExistencia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventario'] }),
  });
}

export function usePostMovimiento(tipo: 'entradas' | 'salidas') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { inventarioId: number; cantidad: number; fecha: string }) => postMovimiento({ tipo, ...v }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['inventario'] });
      qc.invalidateQueries({ queryKey: ['movimientos', tipo, v.inventarioId] });
    },
  });
}

/** Historial de una categoría+sede: una consulta por existencia, unidas y ordenadas por fecha. */
export function useMovimientosCategoria(p: {
  tipo: 'entradas' | 'salidas'; sede: Sede | undefined; categoria: number; mes: string;
}) {
  const { tipo, sede, categoria, mes } = p;
  const existencias = useInventarioQuery({ sede, categoria });
  const lista = useMemo(() => existencias.data?.data ?? [], [existencias.data]);

  const results = useQueries({
    queries: lista.map((e) => ({
      queryKey: ['movimientos', tipo, e.id, mes],
      queryFn: () => getMovimientos(tipo, e.id, mes),
    })),
  });

  const filas = useMemo<MovimientoFila[]>(() => {
    const out: MovimientoFila[] = [];
    results.forEach((r, i) => {
      const e = lista[i];
      (r.data ?? []).forEach((m) =>
        out.push({
          ...m,
          inventarioId: e.id,
          codigo: e.producto?.codigo ?? '—',
          nombre: e.producto?.nombre ?? '—',
          unidad: e.unidadMedida ? `${e.unidadMedida.nombre} (${e.unidadMedida.abreviatura})` : '—',
          fecha: (tipo === 'entradas' ? m.fechaEntrada : m.fechaSalida) ?? '',
        })
      );
    });
    return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [results, lista, tipo]);

  return {
    existencias: lista,
    filas,
    isLoading: existencias.isLoading || results.some((r) => r.isLoading),
    isError: existencias.isError || results.some((r) => r.isError),
    error: existencias.error ?? results.find((r) => r.error)?.error ?? null,
  };
}
