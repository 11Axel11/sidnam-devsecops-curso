import ArchivadasDialog from '@/modules/informativa/galeria/components/ArchivadasDialog'
import FormAgregarCategoria from '@/modules/informativa/galeria/components/FormAgregarCategoria'
import type { Categoria } from '@/modules/informativa/galeria/models/galeria'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Trash } from 'lucide-react'
import DataTable from '@/components/DataTable'
import { useGetCategorias } from '@/modules/informativa/galeria/hooks/galeriaHooks'
import WebLoader from '@/components/Loader'
import FormEditarCategoria from '@/modules/informativa/galeria/components/FormEditarCategoria'
import { usePatchHandleInactiva } from '@/modules/informativa/galeria/hooks/galeriaHooks'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { redirect } from '@tanstack/react-router'
import IfPerm from "@/components/auth/IfPerm";

export const Route = createFileRoute('/informativa/galeria/categorias')({
    component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
        const perms = await ensurePerms(context.queryClient)
        const { canAny } = makeCan(perms)
        const ok = canAny([
            'Informativa.Galeria:Ver',
        ])
        if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    },
})

function AccionesCell({ row }: { row: any }) {
    const archivarCategoria = usePatchHandleInactiva()
    const [open, setOpen] = useState(false)

    return (
        <div className="flex gap-2">
            <IfPerm perm="Informativa.Galeria:Actualizar">
                <FormEditarCategoria id={row.original.id} />
            </IfPerm>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger onClick={() => setOpen(true)}>
                    <Button variant="destructive">
                        <Trash />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Archivar categoría</DialogTitle>
                        <DialogDescription className="text-center mt-6 text-black">
                            ¿Estás seguro de archivar esta categoría?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 mt-6">
                        <Button variant="destructive" className="flex-1" onClick={() => {
                            archivarCategoria.mutate(
                                { id: row.original.id },
                                {
                                    onSuccess: () => {
                                        toast.success("Categoría archivada exitosamente");
                                        setOpen(false);
                                    },
                                    onError: (error) => {
                                        toast.error("Error al archivar la categoría");
                                        console.error("Error archiving category:", error);
                                        setOpen(false);
                                    }
                                }
                            );
                        }}>
                            Archivar
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function RouteComponent() {
    const { Categorias, loadingCategorias } = useGetCategorias()

    const columns: ColumnDef<Categoria>[] = [
        {
            header: "Nombre",
            accessorKey: "nombre"
        },
        {
            header: "Descripción",
            accessorKey: "descripcion"
        },
        {
            header: "Acciones",
            cell: ({ row }) => <AccionesCell row={row} />
        }
    ]

    if (loadingCategorias) {
        return <WebLoader />
    }

    return (
        <div>
            <nav className='flex justify-between items-center mb-2 mx-4 mt-6'>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Categorías</h2>
                <div className='flex gap-2'>
                    <ArchivadasDialog />
                    <FormAgregarCategoria />
                </div>
            </nav>
            <div className="mx-4 mt-8">
                <DataTable
                    columns={columns}
                    data={Categorias}
                    showPagination={false}
                />
            </div>
        </div>
    )
}
