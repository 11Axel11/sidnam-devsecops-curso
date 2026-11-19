import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Sede } from "@/store/sedeStore";
import { nombreSede } from "@/lib/sede";
import type { CrearAreaProveedor, CrearFactura, CrearProveedor, EditarFactura, EditarProveedor } from "../models/proveedores";
import { createAreaProveedor, createFactura, createProveedor, getAreaById, getAreasProveedores, getEstadosFacturas, getFacturaPdf, getFacturas, getFacturasPorNumero, getFacturasPorProveedor, getProveedores, getProveedoresArchivados, getProveedoresPorNombre, getProveedoresPreview, getReporteFacturasPorMesYEstado, patchEstadoFactura, patchEstadoProveedor, patchFactura, patchProveedor } from "../services/proveedoresServices";
// post

export const useCreateAreaProveedor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ area }: { area: CrearAreaProveedor }) =>
      createAreaProveedor({ area }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areasProveedores"] });
    },
  });
};

export const useCreateProveedor = () => {
  return useMutation({
    mutationFn: ({
      proveedor,
    }: {
      proveedor: CrearProveedor;
    }) => createProveedor({ proveedor }),
  });
};

export const useCreateFactura = () => {
  return useMutation({
    mutationFn: ({
      factura,
    }: {
      factura: CrearFactura;
    }) => createFactura({ factura })
  });
};


// get 

export function useGetAreasProveedores(page: number, limit: number) {
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['areasProveedores', page, limit],
    queryFn: () => getAreasProveedores(page, limit)
  })

  return {
    AreasProveedores: data?.data ?? [],
    loadingAreasProveedores: isLoading,
    errorAreasProveedores: error,
    totalAreasProveedores: data?.total ?? 0,
    isPlaceholderData
  }
}

export function useGetProveedores(idArea: string) {
  const { data: Proveedores, isLoading, error } = useQuery({
    queryKey: ['Proveedores', idArea],
    queryFn: () => getProveedores(idArea),
    enabled: !!idArea
  })

  return {
    Proveedores,
    loadingProveedores: isLoading,
    errorProveedores: error
  }
}

export function useGetAreaById(idArea: string) {
  const { data: Area, isLoading, error } = useQuery({
    queryKey: ['areas', idArea],
    queryFn: () => getAreaById(idArea),
    enabled: !!idArea
  })

  return {
    Area,
    loadingAreas: isLoading,
    errorAreas: error
  }
}

export function useGetFacturasPorProveedor(
  idProveedor: string,
  page: number,
  limit: number,
  opts?: { enabled?: boolean }
) {
  const enabled = (opts?.enabled ?? true) && !!idProveedor;
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['facturasProveedor', idProveedor, page, limit],
    queryFn: () => getFacturasPorProveedor(idProveedor, page, limit),
    enabled,
  });

  return {
    FacturasProveedor: data?.data ?? [],
    loadingFacturasProveedor: enabled ? isLoading : false,
    errorFacturasProveedor: enabled ? error : null,
    totalFacturasProveedor: data?.total ?? 0,
    isPlaceholderData
  };
}



export function useGetFacturas(page?: number, limit?: number, estado?: number, sede?: 'hogar' | 'cecuidam') {
  const { data, isLoading, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ['facturasProveedor', estado, page, limit, { sede }],
    queryFn: () => getFacturas(page, limit, estado, sede),
    placeholderData: (prev, prevQuery) => {
      const prevSede = (prevQuery?.queryKey[4] as { sede?: string } | undefined)?.sede;
      return prevSede === sede ? prev : undefined;
    },
    staleTime: 30_000,
  });

  return {
    Facturas: data?.data ?? [],
    totalFacturas: data?.total ?? 0,
    loadingFacturas: isLoading,
    fetchingFacturas: isFetching,
    errorFacturas: error,
    isPlaceholderData,
  };
}


export function useGetFacturasPorNumero(numeroFactura: string) {
  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['facturaProveedor', numeroFactura],
    queryFn: () => {
      if (!numeroFactura.trim()) {
        return Promise.resolve(null);
      }
      return getFacturasPorNumero(numeroFactura);
    },
    enabled: !!numeroFactura.trim(),
  });

  return {
    FacturasProveedorNumero: data,
    loadingFacturasProveedorNumero: isLoading,
    errorFacturasProveedorNumero: error,
    isPlaceholderData
  };
}


export function useGetProveedoresPorNombre(
  nombre: string,
  enabled: boolean = true
) {
  const cleanNombre = nombre.replace(/\s+/g, "");

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['ProveedoresPorNombre', cleanNombre],
    queryFn: () => getProveedoresPorNombre(cleanNombre),
    enabled: enabled && cleanNombre.trim() !== '',
  });

  return {
    proveedoresNombre: data || [],
    loadingProveedoresNombre: isLoading,
    fetchingProveedoresNombre: isFetching,
    errorProveedoresNombre: error,
  };
}

export function useGetProveedoresArchivados(idArea: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['proveedoresArchivados'],
    queryFn: () => getProveedoresArchivados(idArea)
  })

  return {
    ProveedoresArchivados: data || [],
    loadingProveedoresArchivados: isLoading,
    errorProveedoresArchivados: error
  }
}

export function useGetProveedoresPreview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['proveedorPreview'],
    queryFn: () => getProveedoresPreview()
  })

  return {
    ProveedoresPreview: data || [],
    loadingProveedoresPreview: isLoading,
    errorProveedoresPreview: error
  }
}



export function useGetEstadosFacturas() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["estadoFactura"],
    queryFn: () => getEstadosFacturas(),
  });

  return {
    estadoFactura: data,
    loadingEstadosFactura: isLoading,
    fetchingEstadosFactura: isFetching,
    errorEstadosFactura: error,
  };
}

export function useGetReporteFacturasPorMesYEstado() {
  return useMutation({
    mutationFn: async ({ anio, mes, estado, nombreEstado, sede }: { anio: number; mes: number; estado: number, nombreEstado: string; sede?: Sede }) => {
      const pdfBlob = await getReporteFacturasPorMesYEstado(anio, mes, estado, sede);

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const parteSede = sede ? `${nombreSede[sede]}_` : "";
      link.setAttribute("download", `Reporte_Facturas_${parteSede}${nombreEstado}_${mes}_${anio}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  })
}

// patch


export const usePatchFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ factura, idFactura }: { factura: EditarFactura; idFactura: number }) =>
      patchFactura({ factura, idFactura }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturasProveedor'] });
    },
  });
};

export const usePatchEstadoFactura = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idFactura, fecha_pagada }: { idFactura: number; fecha_pagada?: string }) =>
      patchEstadoFactura({ idFactura, fecha_pagada }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturasProveedor'] });
    }
  });
};

export const usePatchProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proveedor, idProveedor }: { proveedor: EditarProveedor; idProveedor: number }) =>
      patchProveedor({ proveedor, idProveedor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Proveedores'] });
    }
  });
};

export const usePatchEstadoProveedor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idProveedor }: { idProveedor: number }) =>
      patchEstadoProveedor({ idProveedor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Proveedores'] });
    }
  });
};


export function useDescargarFacturaPdf() {
  return useMutation({
    mutationFn: async ({ idFactura, numero }: { idFactura: number; numero?: number | string }) => {
      const blob = await getFacturaPdf(idFactura);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Factura_${numero ?? idFactura}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
