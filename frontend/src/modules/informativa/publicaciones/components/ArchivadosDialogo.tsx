import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { type PublicacionType, usePublicacionesInactivas } from '../hooks/usePublicacionesInactivas'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface ArchivadosDialogoProps {
  type: PublicacionType
  onRestore: (id: number, fecha?: string) => void
  isRestoring?: boolean
}

const LABELS: Record<PublicacionType, string> = {
  donacion: 'solicitudes de donaciones',
  proyecto: 'proyectos',
  evento: 'eventos',
}

const SINGULAR_LABELS: Record<PublicacionType, string> = {
  donacion: 'solicitud de donación',
  proyecto: 'proyecto',
  evento: 'evento',
}

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  item: { id: number; Titulo: string; fecha: string }
  type: PublicacionType
  isRestoring?: boolean
  onRestore: (id: number, fecha?: string) => void
}

function PublicacionRow({ item, type, isRestoring, onRestore }: RowProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [fecha, setFecha] = useState<string | undefined>(undefined)
  const [calendarKey, setCalendarKey] = useState(0)

  const handleRestoreClick = () => {
    if (type === 'evento') {
      if (calendarOpen) {
        // Si ya está abierto, solo recrear el Calendar
        setCalendarKey(k => k + 1)
      } else {
        setCalendarOpen(true)
      }
    } else {
      setConfirmOpen(true)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    setFecha(`${y}-${m}-${d}`)
    setCalendarOpen(false)
    setConfirmOpen(true)
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.Titulo}</p>
        <p className="text-sm text-gray-500">
          Fecha original:{' '}
          {new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-CR')}
        </p>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => {
        setConfirmOpen(open)
        if (!open) setFecha(undefined)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Restaurar {SINGULAR_LABELS[type]}?</DialogTitle>
            <DialogDescription asChild className='py-6'>
              <div>
                <span className="font-medium text-gray-900">"{item.Titulo}"</span>{' '}
                volverá a ser visible en la página web.
                {type === 'evento' && fecha ? (
                  <span className="block mt-3">
                    Se publicará con la fecha{' '}
                    {new Date(fecha + 'T00:00:00').toLocaleDateString('es-CR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}.
                  </span>
                ) : (
                  <span className="block mt-3">
                    Se publicará con la fecha de hoy:{' '}
                    {new Date().toLocaleDateString('es-CR')}.
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="update" onClick={() => onRestore(item.id, fecha)}>
              Sí, restaurar
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore button — for evento wraps a Popover so the calendar anchors to it */}
      {type === 'evento' ? (
        <Popover open={calendarOpen} onOpenChange={(open) => {
          if (open) {
            setCalendarKey(k => k + 1)
            setFecha(undefined)
          }
          setCalendarOpen(open)
          if (!open) setFecha(undefined)
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="update"
              size="sm"
              disabled={isRestoring}
              onClick={handleRestoreClick}
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              Restaurar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              key={calendarKey}
              mode="single"
              selected={fecha ? new Date(fecha + 'T00:00:00') : undefined}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return date < today
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <Button
          variant="update"
          size="sm"
          disabled={isRestoring}
          onClick={handleRestoreClick}
          className="shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
          Restaurar
        </Button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ArchivadosDialogo({
  type,
  onRestore,
  isRestoring,
}: ArchivadosDialogoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  const { items, total, loading } = usePublicacionesInactivas(type, currentPage, itemsPerPage)
  const totalPages = Math.ceil(total / itemsPerPage)
  const label = LABELS[type]

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="update" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Restaurar archivados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {label.charAt(0).toUpperCase() + label.slice(1)} archivados
          </DialogTitle>
          <DialogDescription>
            Selecciona los {label} que deseas restaurar
            {type === 'evento' && ' — se te pedirá una nueva fecha al restaurar'}
          </DialogDescription>
        </DialogHeader>

        <div>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center py-4 text-gray-500">
              No hay {label} archivados
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <PublicacionRow
                  key={item.id}
                  item={item}
                  type={type}
                  isRestoring={isRestoring}
                  onRestore={onRestore}
                />
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}