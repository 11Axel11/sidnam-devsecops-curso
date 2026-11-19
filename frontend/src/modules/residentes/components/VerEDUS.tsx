import { Button } from "@/components/ui/button"
import { ExternalLink, Stethoscope } from "lucide-react"
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/animate-ui/radix/dialog';
import { useGetEDUS } from "../hooks/enfermeria/enfermeriaHooks";
import { useNavigate } from "@tanstack/react-router";
import FormActualizarEDUS from "./enfermeria/FormActualizarEDUS";
import IfPerm from "@/components/auth/IfPerm";

const VerEDUS = () => {
  const { EDUS } = useGetEDUS();
  const nav = useNavigate();

  const handleIrAjustes = () => {
    nav({ to: "/ajustes" });
  }

  if (!EDUS) {
    return <Dialog>
      <DialogTrigger>
        <Button variant={"secondary"}>
          <Stethoscope />
          EDUS
      </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="mb-5">
          <DialogTitle className="flex gap-3 font-semibold">
            <Stethoscope size={20} />
            Credenciales de EDUS
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-justify">
          No tienes una contraseña de EDUS creada. Puedes crear una nueva contraseña en la sección de ajustes.
        </DialogDescription>
        <Button variant={"outline"} onClick={handleIrAjustes}>
          <ExternalLink />Ir a ajustes
        </Button>
      </DialogContent>
    </Dialog>;
  }

  return (
    <Dialog>
          <DialogTrigger>
              <Button variant={"secondary"}>
                  <Stethoscope />
                  EDUS
              </Button></DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex gap-3 font-semibold">
                    <Stethoscope size={20}/>
                    Credenciales de EDUS
                </DialogTitle>
            </DialogHeader>
            <p className="text-justify text-md">
              <strong className="font-semibold">
                Contraseña actual:
              </strong>
              {" "}
              {EDUS.password}
            </p>
            <DialogFooter>
          <IfPerm perm="Residencia.General Expedientes:Actualizar">
                <FormActualizarEDUS idActual={EDUS.id_password} />
              </IfPerm>
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Cerrar
                </Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  )
}

export default VerEDUS
