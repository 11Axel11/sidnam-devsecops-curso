import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import type { PublicacionProps } from "../types/publicaciones"
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "@tanstack/react-router";
import FormEditarPublicacion from "./FormEditarPublicacion";
import IfPerm from "@/components/auth/IfPerm";
import { toast } from "sonner";

const CardPublicacion = ({ publicacion, onArchive, archiving, link, tipo, onUpdate, updating }: PublicacionProps) => {
  const navigate = useNavigate()
  const date = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(publicacion.fecha)
    if (m) {
      const [, y, mo, d] = m
      return new Date(Number(y), Number(mo) - 1, Number(d))
    }
    return new Date(publicacion.fecha)
  })()

  const formattedDate = isNaN(date.getTime())
    ? publicacion.fecha
    : date.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })

  const handleArchive = async (id: number) => {
    try {
      await onArchive?.(id)
      toast.success("Publicación archivada", {
        description: "La publicación ha sido archivada exitosamente.",
        duration: 4000,
      });
    } catch (error) {
      toast.error("Error al archivar", {
        description: "No se pudo archivar la publicación. Intente de nuevo.",
        duration: 4000,
      });
    } finally {
      navigate({ to: link })
    }
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <div className="grid gap-6 px-6 md:grid-cols-2 items-stretch">
        <div className="overflow-hidden rounded-lg border bg-muted/20">
          {publicacion.imagenUrl ? (
            <img
              src={publicacion.imagenUrl}
              alt={publicacion.Titulo}
              className="h-full w-full object-cover md:min-h-[300px]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[220px] w-full items-center justify-center text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>

        <div className="flex flex-col justify-evenly">
          <Button 
            variant="outline" 
            className="self-end mt-0" 
            onClick={() => navigate({ to: link })}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader className="gap-2 px-0">
            <CardTitle className="text-2xl font-semibold leading-tight mt-8 break-words hyphens-auto max-w-lg mx-auto">
              {publicacion.Titulo}
            </CardTitle>
          </CardHeader>

          <Separator className="mx-0" />

          <CardContent className="flex flex-col gap-10 mt-8 w-full max-w-xl mx-auto">
            <CardDescription className="text-base leading-relaxed text-black break-words hyphens-auto">
              {publicacion.Descripcion}
            </CardDescription>
            <CardDescription className="text-left text-sm leading-relaxed text-black">
              {tipo === 'evento' ? 'Fecha del evento: ' + formattedDate : 'Fecha de la publicación: ' + formattedDate}
            </CardDescription>
          </CardContent>

          <CardFooter className="flex justify-between gap-2 mt-12">
            <IfPerm anyOf={[
              "Informativa.Proyectos:Actualizar",
              "Informativa.Eventos:Actualizar",
              "Donaciones.Solicitud Donaciones:Actualizar",
            ]}>
              <FormEditarPublicacion
                tipo={tipo}
                publicacion={publicacion}
                onSubmit={onUpdate}
                updating={updating}
              />
            </IfPerm>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1 mr-2 border border-gray-300 shadow-sm">
                  <Trash className="mr-2 h-4 w-4" />
                  Archivar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archivar publicación</DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-black my-6">
                  ¿Estás seguro de que quieres archivar esta publicación?
                </DialogDescription>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => handleArchive(publicacion.id)}
                    disabled={archiving}
                  >
                    {archiving ? "Archivando..." : "Sí, archivar"}
                  </Button>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
};

export default CardPublicacion;