import WebLoader from "@/components/Loader";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
} from "@/components/ui/pagination";
import CardPreviewExpedienteVoluntario from "@/modules/voluntariado/components/CardPreviewExpedienteVoluntario";
import { useGetAllExpedientesVoluntarioPorCedula } from "@/modules/voluntariado/hooks/gestionVoluntariado/gestionHooks";
import { ensurePerms, makeCan } from "@/services/authHelpers";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";

export const Route = createFileRoute("/voluntarios/gestion/historial/$cedula")({
  component: RouteComponent,
  parseParams: (params) => ({
    cedula: z.coerce.number().int().positive().parse(params.cedula),
  }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Voluntariado.Gestion Voluntariado:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const limit = 12;
  const [page, setPage] = useState(1);
  const { cedula } = useParams({
    from: "/voluntarios/gestion/historial/$cedula",
  });

  const {
    totalExpedientesVoluntario,
    expedientesVoluntario,
    fetchingExpedientesVoluntario,
    loadingExpedientesVoluntario,
    isPlaceholderData,
  } = useGetAllExpedientesVoluntarioPorCedula(cedula, page, limit);

  const totalPages = Math.ceil(totalExpedientesVoluntario / limit);
  const isLastPage = page >= totalPages;

  const verExpediente = (id: number) => {
    const idNum = Number(id);

    navigate({
      to: "/voluntarios/gestion/$id",
      params: { id: idNum },
    });
  };

  const prevPage = () => setPage((p) => Math.max(p - 1, 1));

  const nextPage = () => {
    if (!isPlaceholderData && !isLastPage) {
      setPage((p) => p + 1);
    }
  };

  if (fetchingExpedientesVoluntario || loadingExpedientesVoluntario) {
    return (
      <>
        <WebLoader />
      </>
    );
  }

  return (
    <section className=" m-5 flex flex-col gap-4">
      <div className="flex gap-5 flex-wrap justify-center">
        {expedientesVoluntario?.map((expediente) => (
          <CardPreviewExpedienteVoluntario
            variant="historial"
            key={expediente.id}
            expediente={expediente}
            clickAction={() => verExpediente(expediente.id)}
          />
        ))}
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={prevPage} />
          </PaginationItem>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  onClick={() => setPage(pageNumber)}
                  isActive={page === pageNumber}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>

          <PaginationItem>
            <PaginationNext onClick={nextPage} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </section>
  );
}
