/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import WebLoader from '@/components/Loader';
import { Search } from 'lucide-react';
import CardPreviewExpedienteResidente from '@/modules/residentes/components/CardPreviewExpedienteResidente';
import type { PreviewExpedienteResidente } from '@/modules/residentes/models/expedienteResidente';
import useDebounce from '@/modules/voluntariado/hooks/gestionVoluntariado/useDebounce';
import {
  useGetExpedienteResidentePorCedula,
  useGetExpedientesResidentePorNombre,
} from '@/modules/residentes/hooks/expedientesHooks';

type SearchMode = 'cedula' | 'nombre';

type BuscarExpedienteDialogProps = {
  onSelect: (idExpediente: number, expediente: PreviewExpedienteResidente) => void;

  trigger?: React.ReactNode;

  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  initialMode?: SearchMode;

  placeholderCedula?: string;
  placeholderNombre?: string;

  triggerText?: string;
};

export default function BuscarExpedienteDialog({
  onSelect,
  trigger,
  open,
  onOpenChange,
  initialMode = 'cedula',
  placeholderCedula = 'Buscar por cédula',
  placeholderNombre = 'Buscar por nombre',
  triggerText = 'Buscar expediente',
}: BuscarExpedienteDialogProps) {
  const isControlled = typeof open === 'boolean' && typeof onOpenChange === 'function';
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = isControlled ? (open as boolean) : internalOpen;
  const setDialogOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setInternalOpen(v));

  const [searchMode, setSearchMode] = useState<SearchMode>(initialMode);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [isTyping, setIsTyping] = useState(false);
  useEffect(() => {
    if (!searchTerm) {
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const enabled = dialogOpen === true;

  const canSearchCedula =
    enabled &&
    searchMode === 'cedula' &&
    debouncedSearchTerm.trim() !== '' &&
    !Number.isNaN(Number(debouncedSearchTerm));

  const canSearchNombre =
    enabled &&
    searchMode === 'nombre' &&
    debouncedSearchTerm.trim().length >= 1;

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

  const results: PreviewExpedienteResidente[] = useMemo(() => {
    if (searchMode === 'cedula') {
      return expedienteResidenteCedula ? [expedienteResidenteCedula] as any : [];
    }
    return (expedientesResidenteNombre ?? []) as any;
  }, [searchMode, expedienteResidenteCedula, expedientesResidenteNombre]);

  const isSearchLoading = useMemo(() => {
    const typing = searchTerm !== debouncedSearchTerm && searchTerm.trim() !== '';
    if (searchMode === 'cedula') {
      return loadingExpedienteResidenteCedula || typing;
    }
    return loadingExpedientesResidenteNombre || typing;
  }, [
    searchMode,
    searchTerm,
    debouncedSearchTerm,
    loadingExpedienteResidenteCedula,
    loadingExpedientesResidenteNombre,
  ]);

  const toggleSearchMode = () => {
    setSearchMode((prev) => (prev === 'cedula' ? 'nombre' : 'cedula'));
    setSearchTerm('');
  };

  const handleSelect = (exp: PreviewExpedienteResidente) => {
    onSelect(exp.id_expediente, exp);
    setDialogOpen(false);
    setSearchTerm('');
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" className="w-auto">
            <Search />
            {triggerText}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex gap-5 mt-3">
            <Input
              placeholder={searchMode === 'cedula' ? placeholderCedula : placeholderNombre}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`max-w-sm mb-3 ${searchMode === 'cedula'
                ? '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                : ''}`}
              type={searchMode === 'cedula' ? 'number' : 'text'}
              inputMode={searchMode === 'cedula' ? 'numeric' : 'text'}
            />
            <Button variant="secondary" onClick={toggleSearchMode}>
              {searchMode === 'cedula' ? 'Buscar por nombre' : 'Buscar por cédula'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="flex justify-center">
          {searchTerm ? (
            isTyping ? (
              <span>Buscando por {searchMode === 'cedula' ? 'cédula.' : 'nombre'}...</span>
            ) : isSearchLoading ? (
              <WebLoader />
            ) : results.length > 0 ? (
              <span>
                {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado
                {results.length !== 1 ? 's' : ''}:
              </span>
            ) : (
              <span>
                No se encontraron expedientes con {searchMode === 'cedula' ? 'esa cédula' : 'ese nombre'}.
                {searchMode === 'nombre' && ' Intenta ser más específico.'}
              </span>
            )
          ) : (
            <span>Ingrese {searchMode === 'cedula' ? 'una cédula' : 'un nombre'} para buscar un expediente.</span>
          )}
        </DialogDescription>

        {!isTyping && searchTerm && results.length > 0 && (
          <div className="mt-2 w-full">
            <div className={`${searchMode === 'nombre'
                ? 'max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent'
                : ''}`}>
              <div className="flex flex-col gap-4 py-2">
                {results.map((expediente) => (
                  <CardPreviewExpedienteResidente
                    key={expediente.id_expediente}
                    expediente={expediente}
                    clickAction={() => handleSelect(expediente)}
                  />
                ))}
              </div>
            </div>

            {searchMode === 'nombre' && results.length >= 5 && (
              <div className="flex justify-center mt-2">
                <p className="text-sm text-muted-foreground">
                  {results.length >= 10
                    ? 'Mostrando los primeros resultados. Intenta ser más específico.'
                    : `Se encontraron ${results.length} coincidencias.`}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
