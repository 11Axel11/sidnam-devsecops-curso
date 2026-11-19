import IfPerm from '@/components/auth/IfPerm';
import WebLoader from '@/components/Loader';
import CardLibroDeCampo from '@/modules/residentes/components/trabajo-social/CardLibroDeCampo';
import CardSalidaConFamiliar from '@/modules/residentes/components/trabajo-social/CardSalidaConFamiliar';
import FormCrearLibroDeCampo from '@/modules/residentes/components/trabajo-social/FormCrearLibroDeCampo';
import FormSalidaConFamiliar from '@/modules/residentes/components/trabajo-social/FormSalidaConFamiliar';
import { useExpedienteEstado } from '@/modules/residentes/context/expedienteEstadoContext';
import { useGetLibroDeCampo, useGetSalidasFamiliares } from '@/modules/residentes/hooks/trabajo-social/trabajoSocialHooks';
import { SmartPagination } from '@/components/PaginationComponent';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/animate-ui/components/radix/tabs";

export const Route = createFileRoute('/residentes/$id/trabajo-social/')({
    component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
        const perms = await ensurePerms(context.queryClient)
        const { canAny } = makeCan(perms)
        const ok = canAny([
            'Residencia.Trabajo Social:Ver'
        ])
        if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    },
})

function RouteComponent() {
    const { id } = useParams({ from: "/residentes/$id/trabajo-social/" });
    const idExpediente = Number(id);
    const limit = 4;
    const [activeTab, setActiveTab] = useState("bitacoras");

    const [pageBitacora, setPageBitacora] = useState(1);
    const [pageSalida, setPageSalida] = useState(1);

    const {
        BitacorasLibroDeCampo,
        totalBitacorasLibroDeCampo,
        loadingBitacorasLibroDeCampo,
        isPlaceholderData: isPlaceholderBitacora
    } = useGetLibroDeCampo(idExpediente, pageBitacora, limit, activeTab === "bitacoras");

    const {
        salidaOngoing,
        salidasFamiliares,
        totalSalidasFamiliares,
        loadingSalidasFamiliares,
        isPlaceholderData: isPlaceholderSalida
    } = useGetSalidasFamiliares(idExpediente, pageSalida, limit, activeTab === "salidas");

    const estadoExpediente = useExpedienteEstado();
    const mostrarFormularioCrear = estadoExpediente !== "Inactivo";

    useEffect(() => {
        setPageBitacora(1);
        setPageSalida(1);
    }, [id]);

    const totalPagesBitacora = Math.ceil((totalBitacorasLibroDeCampo || 0) / limit);
    const totalPagesSalida = Math.ceil((totalSalidasFamiliares || 0) / limit);

    return (
        <section className='ml-3 mr-3 mt-3'>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4 gap-0">

                <div className='flex items-center justify-between'>
      <TabsList className=" bg-muted-foreground/10">
                        <TabsTrigger value="bitacoras" className="text-center">Notas de bitácora</TabsTrigger>
                        <TabsTrigger value="salidas" className="text-center">Registros de salidas con familiares</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="bitacoras" className="mt-0 w-full">
                    <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 text-center">
                            <h3 className="font-semibold text-foreground">Crear bitácora</h3>
                            <p className="text-muted-foreground">Registra una nueva nota del libro de campo.</p>
                        </div>
                        <IfPerm perm='Residencia.Trabajo Social:Crear'>
                            {mostrarFormularioCrear && <FormCrearLibroDeCampo />}
                        </IfPerm>
                    </div>

                    <main className='flex gap-6 flex-wrap justify-center mt-6'>
                        {loadingBitacorasLibroDeCampo ? (
                            <WebLoader />
                        ) : !BitacorasLibroDeCampo || BitacorasLibroDeCampo.length === 0 ? (
                            <p className='text-center text-gray-500 mt-8'>
                                No hay registros disponibles en el libro de campo.
                            </p>
                        ) : (
                            <>
                                {BitacorasLibroDeCampo.map((entrada) => (
                                    <CardLibroDeCampo key={entrada.id} entrada={entrada} />
                                ))}

                                {totalPagesBitacora > 1 && (
                                    <SmartPagination
                                        currentPage={pageBitacora}
                                        totalPages={totalPagesBitacora}
                                        onPageChange={setPageBitacora}
                                        maxVisiblePages={4}
                                        isLoading={isPlaceholderBitacora}
                                        className="mt-6 w-full"
                                    />
                                )}
                            </>
                        )}
                    </main>
                </TabsContent>

                <TabsContent value="salidas" className="mt-0 w-full">
                    <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 text-center">
                            <h3 className="font-semibold text-foreground">Crear salida con familiar</h3>
                            <p className="text-muted-foreground">Registra una salida o regreso con un familiar responsable.</p>
                        </div>
                        <IfPerm perm='Residencia.Trabajo Social:Crear'>
                            {mostrarFormularioCrear && <FormSalidaConFamiliar />}
                        </IfPerm>
                    </div>

                    <div className="mt-8 space-y-10">
                        {salidaOngoing && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <h3 className="text-base font-semibold text-foreground">Salida en curso</h3>
                                        <p className="text-sm text-muted-foreground">Registro activo actualmente.</p>
                                    </div>
                                    <hr className="flex-1 border-t border-border" />
                                </div>
                                <div className="flex justify-center">
                                    <CardSalidaConFamiliar salida={salidaOngoing} title="Salida en curso" />
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">Historial de salidas</h3>
                                    <p className="text-sm text-muted-foreground">Registros anteriores organizados por página.</p>
                                </div>
                                <hr className="flex-1 border-t border-border" />
                            </div>

                            <main className='flex gap-6 flex-wrap justify-center mt-2'>
                                {loadingSalidasFamiliares ? (
                                    <WebLoader />
                                ) : !salidasFamiliares || salidasFamiliares.length === 0 ? (
                                    <p className='text-center text-gray-500 mt-8'>
                                        No hay registros de salidas disponibles.
                                    </p>
                                ) : (
                                    <>
                                        {salidasFamiliares.map((salida) => (
                                            <CardSalidaConFamiliar key={salida.id_salida} salida={salida} />
                                        ))}

                                        {totalPagesSalida > 1 && (
                                            <SmartPagination
                                                currentPage={pageSalida}
                                                totalPages={totalPagesSalida}
                                                onPageChange={setPageSalida}
                                                maxVisiblePages={4}
                                                isLoading={isPlaceholderSalida}
                                                className="mt-6 w-full"
                                            />
                                        )}
                                    </>
                                )}
                            </main>
                        </section>
                    </div>
                </TabsContent>
            </Tabs>
        </section>
    );
}