import { useEffect, useMemo, useState } from 'react';
import useDebounce from '@/modules/voluntariado/hooks/gestionVoluntariado/useDebounce';
import {
  useGetExpedienteResidentePorCedula,
  useGetExpedientesResidentePorNombre,
} from '@/modules/residentes/hooks/expedientesHooks';

export type SearchMode = 'cedula' | 'nombre';

type Options = {
  enabled?: boolean;          // útil p/abrir/cerrar con un diálogo
  initialMode?: SearchMode;   // modo inicial
  minLenNombre?: number;      // longitud mínima para nombre (default 1)
};

export function useExpedienteSearch(opts: Options = {}) {
  const {
    enabled = true,
    initialMode = 'cedula',
    minLenNombre = 1,
  } = opts;

  const [searchMode, setSearchMode] = useState<SearchMode>(initialMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Estados "enabled" por modo
  const canSearchCedula =
    enabled &&
    searchMode === 'cedula' &&
    debouncedSearchTerm.trim() !== '' &&
    !Number.isNaN(Number(debouncedSearchTerm));

  const canSearchNombre =
    enabled &&
    searchMode === 'nombre' &&
    debouncedSearchTerm.trim().length >= minLenNombre;

  // Queries unificadas
  const { expedienteResidenteCedula, loadingExpedienteResidenteCedula } =
    useGetExpedienteResidentePorCedula(
      searchMode === 'cedula' ? Number(debouncedSearchTerm) || 0 : 0,
      canSearchCedula
    );

  const { expedientesResidenteNombre, loadingExpedientesResidenteNombre } =
    useGetExpedientesResidentePorNombre(
      searchMode === 'nombre' ? debouncedSearchTerm : '',
      canSearchNombre
    );

  // Resultados unificados
  const results = useMemo(() => {
    if (searchMode === 'cedula') {
      return expedienteResidenteCedula ? [expedienteResidenteCedula] : [];
    }
    return expedientesResidenteNombre || [];
  }, [searchMode, expedienteResidenteCedula, expedientesResidenteNombre]);

  // Loading unificado
  const isSearchLoading = useMemo(() => {
    if (searchMode === 'cedula') {
      const typing = searchTerm !== debouncedSearchTerm && searchTerm.trim() !== '';
      return loadingExpedienteResidenteCedula || typing;
    }
    const typing = searchTerm !== debouncedSearchTerm && searchTerm.trim() !== '';
    return loadingExpedientesResidenteNombre || typing;
  }, [
    searchMode,
    searchTerm,
    debouncedSearchTerm,
    loadingExpedienteResidenteCedula,
    loadingExpedientesResidenteNombre,
  ]);

  // UX: indicador "isTyping"
  useEffect(() => {
    if (!searchTerm) {
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const toggleSearchMode = () => {
    setSearchMode((prev) => (prev === 'cedula' ? 'nombre' : 'cedula'));
    setSearchTerm('');
  };

  const clearSearch = () => setSearchTerm('');

  return {
    // estado
    searchMode,
    setSearchMode,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    isTyping,
    // resultados
    results,
    isSearchLoading,
    // helpers
    toggleSearchMode,
    clearSearch,
    canSearchCedula,
    canSearchNombre,
  };
}
