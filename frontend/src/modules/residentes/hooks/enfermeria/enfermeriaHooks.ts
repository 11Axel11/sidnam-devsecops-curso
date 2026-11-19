import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdministracionEspecialResidente, createAdministracionResidente, createConsultaEBAIS, createConsultaEspecialista, createCuracion, createEDUS, createMedicamento, createNotaEnfermeria, createPatologia, createPatologiaResidente, createTipoConsulta, deleteAdministracionEspecialResidente, deleteAdministracionResidente, deletePatologiaResidente, getConsultasEBAIS, getConsultasEspecialista, getCuraciones, getEDUS, getExpedienteEnfermeria, getMedicamentos, getNotasEnfermeria, getPatologias, getTipoMedicamento, getTiposBitacora, getTiposConsultaEspecialista, getTurnos, patchEDUS } from "../../services/enfermeriaServices";
import type { Consulta, CrearAdministracion, CrearAdministracionesEspeciales, CrearConsultaEspecialista, CrearMedicamento, CrearNotas, Patologia } from "../../models/enfermeria";
import type { CreateEDUS } from "../../models/edus";


export const useCreateMedicamento = () => {
  return useMutation({
    mutationFn: ({
      idTipoMedicamento,
      medicamento,
    }: {
      idTipoMedicamento: number;
      medicamento: CrearMedicamento;
    }) => createMedicamento({ idTipoMedicamento, medicamento }),
  });
};

export const useCreatePatologia = () => {
  return useMutation({
    mutationFn: ({
      patologia,
    }: {
      patologia: Patologia;
    }) => createPatologia({ patologia }),
  });
};

export const useCreateTipoConsulta = () => {
  return useMutation({
    mutationFn: ({
      consulta,
    }: {
      consulta: Consulta;
    }) => createTipoConsulta({ consulta }),
  });
};


export function useCreatePatologiaResidente() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (
      { idExpediente, idPatologia }: { idExpediente: number; idPatologia: number }) =>
      createPatologiaResidente(idExpediente, idPatologia),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patologia', 'expedienteResidenteId'] })
    },
  })

  return mutation;
}

export function useDeletePatologiaResidente() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (
      { idExpediente, idPatologia }: { idExpediente: number; idPatologia: number }) =>
      deletePatologiaResidente(idExpediente, idPatologia),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patologias', 'expedienteResidenteId'] })
    },
  })

  return mutation;
}

export function useCreateAdministracion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { idExpediente: number } & CrearAdministracion) =>
      createAdministracionResidente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['administraciones', 'expedienteResidenteId'] });
    },
  });
}

export function useCreateAdministracionEspecial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { idExpediente: number } & CrearAdministracionesEspeciales) =>
      createAdministracionEspecialResidente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['administracionesEspeciales', 'expedienteResidenteId'] });
    },
  });
}


export function useCreateEDUS() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (
      { edus }: { edus: CreateEDUS }) =>
      createEDUS(edus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edus'] })
    },
  })

  return mutation;
}


// bitacoras

export function useCreateNotaEnfermeria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idExpediente, nota }: { idExpediente: number; nota: CrearNotas }) =>
      createNotaEnfermeria(idExpediente, nota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notasEnfermeria'] });
    },
  });
}

export function useCreateConsultaEspecialista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idTipo, idExpediente, nota }: { idTipo: number; idExpediente: number; nota: CrearConsultaEspecialista }) =>
      createConsultaEspecialista(idTipo, idExpediente, nota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultasEspecialista'] });
    },
  });
}

export function useCreateCuracion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idExpediente, nota }: { idExpediente: number; nota: CrearNotas }) =>
      createCuracion(idExpediente, nota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curaciones', 'expedienteResidenteId'] });
    },
  });
}

export function useCreateConsultaEBAIS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idExpediente, nota }: { idExpediente: number; nota: CrearNotas }) =>
      createConsultaEBAIS(idExpediente, nota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultasEBAIS'] });
    },
  });
}

// gets


export function useGetMedicamentos(idTipoMedicamento: number) {
  const { data: Medicamentos, isLoading, error } = useQuery({
    queryKey: ['medicamentos', idTipoMedicamento],
    queryFn: () => getMedicamentos(idTipoMedicamento)
  })

  return {
    Medicamentos,
    loadingMedicamentos: isLoading,
    errorMedicamentos: error
  }
}

export function useGetPatologias() {
  const { data: Patologias, isLoading, error } = useQuery({
    queryKey: ['patologias'],
    queryFn: getPatologias
  })

  return {
    Patologias,
    loadingPatologias: isLoading,
    errorPatologias: error
  }
}

export function useGetExpedienteResidenteEnfermeria(
  id: number,
) {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["expedienteResidenteId", id],
    queryFn: () => getExpedienteEnfermeria(id),
  });

  return {
    expedienteResidenteEnfermeria: data,
    loadingExpedienteResidenteEnfermeria: isLoading,
    fetchingExpedienteResidenteEnfermeria: isFetching,
    errorExpedienteResidenteEnfermeria: error,
  };
}

export function useGetTiposBitacora() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["tipoBitacora"],
    queryFn: () => getTiposBitacora(),
  });

  return {
    tipoBitacora: data,
    loadingTipoBitacora: isLoading,
    fetchingTipoBitacora: isFetching,
    errorTipoBitacora: error,
  };
}

export function useGetTiposConsultaEspecialista() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["tipoConsulta"],
    queryFn: () => getTiposConsultaEspecialista(),
  });

  return {
    TipoConsulta: data,
    loadingTipoConsulta: isLoading,
    fetchingTipoConsulta: isFetching,
    errorTipoConsulta: error,
  };
}

export const useGetTiposMedicamento = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tipoMedicamento',],
    queryFn: () => getTipoMedicamento()
  });

  return {
    TiposMedicamentos: data,
    loadingTiposMedicamentos: isLoading,
    errorTiposMedicamentos: error
  };
};

export function useGetTurnos() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["turnos"],
    queryFn: getTurnos,
  });

  return {
    turnos: data,
    loadingTurnos: isLoading,
    fetchingTurnos: isFetching,
    errorTurnos: error,
  };
}


export function useGetEDUS() {
  const { data: EDUS, isLoading, error } = useQuery({
    queryKey: ['edus'],
    queryFn: getEDUS
  })

  return {
    EDUS,
    loadingEDUS: isLoading,
    errorEDUS: error
  }
}

// bitacoras


export function useGetNotasEnfermeria(id: number, page: number = 1, limit: number = 4, enabled: boolean = true) {
  const { data: NotasEnfermeria, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['notasEnfermeria', id, page, limit],
    queryFn: () => getNotasEnfermeria(id, page, limit),
    placeholderData: keepPreviousData,
    enabled: enabled && id > 0,
  });

  return {
    NotasEnfermeria: NotasEnfermeria?.data ?? [],
    totalNotasEnfermeria: NotasEnfermeria?.total ?? 0,
    loadingNotasEnfermeria: isLoading,
    errorNotasEnfermeria: error,
    isPlaceholderData,
  };
}

export function useGetCuraciones(id: number, page: number = 1, limit: number = 4, enabled: boolean = true) {
  const { data: Curaciones, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['curaciones', id, page, limit],
    queryFn: () => getCuraciones(id, page, limit),
    placeholderData: keepPreviousData,
    enabled: enabled && id > 0,
  });

  return {
    Curaciones: Curaciones?.data ?? [],
    totalCuraciones: Curaciones?.total ?? 0,
    loadingCuraciones: isLoading,
    errorCuraciones: error,
    isPlaceholderData,
  };
}

export function useGetConsultasEspecialista(idTipo: number, id: number, page: number = 1, limit: number = 4, enabled: boolean = true) {
  const { data: ConsultasEspecialista, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['consultasEspecialista', idTipo, id, page, limit],
    queryFn: () => getConsultasEspecialista(idTipo, id, page, limit),
    placeholderData: keepPreviousData,
    enabled: enabled && id > 0 && idTipo > 0,
  });

  return {
    ConsultasEspecialista: ConsultasEspecialista?.data ?? [],
    totalConsultasEspecialista: ConsultasEspecialista?.total ?? 0,
    loadingConsultasEspecialista: isLoading,
    errorConsultasEspecialista: error,
    isPlaceholderData,
  };
}

export function useGetConsultasEBAIS(id: number, page: number = 1, limit: number = 4, enabled: boolean = true) {
  const { data: ConsultasEBAIS, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['consultasEBAIS', id, page, limit],
    queryFn: () => getConsultasEBAIS(id, page, limit),
    placeholderData: keepPreviousData,
    enabled: enabled && id > 0,
  });

  return {
    ConsultasEBAIS: ConsultasEBAIS?.data ?? [],
    totalConsultasEBAIS: ConsultasEBAIS?.total ?? 0,
    loadingConsultasEBAIS: isLoading,
    errorConsultasEBAIS: error,
    isPlaceholderData,
  };
}


// delete 


export const useDeleteAdministracionResidente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idAdministracion, idMedicamento
    }: {
      idAdministracion: string;
      idMedicamento: string;
    }) => deleteAdministracionResidente({ idAdministracion, idMedicamento }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["expedienteResidenteId",],
      });
    },
  });
};

export const useDeleteAdministracionEspecialResidente = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idAdministracionEspecial
    }: {
      idAdministracionEspecial: string;
    }) => deleteAdministracionEspecialResidente({ idAdministracionEspecial }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["expedienteResidenteId",],
      });
    },
  });
};



// patch


export const useEditarEDUS = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: patchEDUS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edus"] });
    },
  });

  return mutation;

};