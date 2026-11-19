import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/DataTable'
import WebLoader from '@/components/Loader'
import IfPerm from '@/components/auth/IfPerm'
import { Button } from '@/components/ui/button'
import { useConfirmacion } from '@/hooks/useConfirmar'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import {
  esCategoriaLegacy, requireFor, permsInventarioCategoria,
} from '@/modules/inventarios/permissions'
import { useInventarioQuery, usePatchArchivarExistencia } from '@/modules/inventarios/hooks/existenciaHooks'
import type { Existencia } from '@/modules/inventarios/models/existencia'
import AgregarExistenciaDialogo from '@/modules/inventarios/components/AgregarExistenciaDialogo'
import ExistenciasArchivadasDialogo from '@/modules/inventarios/components/ExistenciasArchivadasDialogo'
import EditarExistenciaBoton from '@/modules/inventarios/components/EditarExistenciaBoton'
import { mensajeError } from '@/utils/apiError'

export const Route = createFileRoute('/inventarios/$categoryId/inventario')({
  beforeLoad: async ({ context, params, location }) => {
    if (esCategoriaLegacy(params.categoryId)) throw redirect({ to: '/inventarios/$categoryId', params, search: { sede: 'hogar' } });
    const perms = await ensurePerms(context.queryClient);
    const { canAny } = makeCan(perms);
    if (!canAny(permsInventarioCategoria(params.categoryId))) throw redirect({ to: '/403', search: { from: location.href } });
  },
  component: InventarioPage,
})

function InventarioPage() {
  const { categoryId } = Route.useParams()
  const { sede } = Route.useSearch()
  const categoria = Number(categoryId)

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const confirmar = useConfirmacion()
  const { mutateAsync: archivar } = usePatchArchivarExistencia()

  const { data, isLoading, error } = useInventarioQuery({
    sede, categoria, archivado: false, page: pageIndex + 1, limit: pageSize,
  })

  const handleArchivar = async (e: Existencia) => {
    const ok = await confirmar(`¿Estás seguro de que deseas archivar "${e.producto?.nombre}" en esta sede?`, 'destructive')
    if (!ok) return
    try {
      await archivar({ id: e.id, archivado: true })
      toast.success('Producto archivado correctamente')
    } catch (err) {
      toast.error(mensajeError(err, 'Error al archivar el producto'))
    }
  }

  const columns = useMemo<ColumnDef<Existencia>[]>(() => [
    { header: 'Código', id: 'codigo', cell: ({ row }) => row.original.producto?.codigo ?? '—' },
    { header: 'Nombre', id: 'nombre', cell: ({ row }) => row.original.producto?.nombre ?? '—' },
    {
      header: 'Unidad de medida',
      id: 'unidad',
      cell: ({ row }) => {
        const u = row.original.unidadMedida
        return u ? `${u.nombre} (${u.abreviatura})` : '—'
      },
    },
    { header: 'Stock', accessorKey: 'stock' },
    {
      header: 'Acciones',
      id: 'acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <IfPerm perm={requireFor(categoryId, 'Actualizar')!}>
            <EditarExistenciaBoton existencia={row.original} categoriaId={categoria} />
          </IfPerm>
          <IfPerm anyOf={[requireFor(categoryId, 'Eliminar')!, requireFor(categoryId, 'Actualizar')!]}>
            <Button variant="destructive" onClick={() => handleArchivar(row.original)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </IfPerm>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [categoria, categoryId])

  if (!sede) return null
  if (isLoading) return <WebLoader />
  if (error) return <p className="p-4 text-center text-red-700">{mensajeError(error, 'No se pudo cargar el inventario.')}</p>

  return (
    <div className="p-4">
      <nav className="flex justify-between mb-4">
        <IfPerm perm={requireFor(categoryId, 'Crear')!}>
          <AgregarExistenciaDialogo sede={sede} categoryId={categoria} />
        </IfPerm>
        <IfPerm anyOf={[requireFor(categoryId, 'Actualizar')!, requireFor(categoryId, 'Eliminar')!]}>
          <ExistenciasArchivadasDialogo sede={sede} categoryId={categoria} />
        </IfPerm>
      </nav>
      <div className="mx-auto">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.total ?? 0}
          pageIndex={pageIndex}
          pageSize={pageSize}
          setPageIndex={setPageIndex}
          setPageSize={setPageSize}
        />
      </div>
    </div>
  )
}
