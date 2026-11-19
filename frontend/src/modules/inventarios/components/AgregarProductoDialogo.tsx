import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import FormAgregarProducto from "./FormAgregarProducto"
import { useNavigate } from "@tanstack/react-router"

interface AgregarProductoDialogoProps {
  categoryId: number;
  onSuccess: () => void;
}

const AgregarProductoDialogo = ({ categoryId, onSuccess }: AgregarProductoDialogoProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const navigate = useNavigate();

    const handleSuccess = () => {
      setIsDialogOpen(false);
      onSuccess();
  };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="create" onClick={() => setIsDialogOpen(true)}>
              <Plus  />
              Agregar producto
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center mr-6">
                <span>Agregar producto</span>
                <Button variant="outline" onClick={() => navigate({ to: '/ajustes' })}>
                  Agregar nueva unidad de medida
                </Button>
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="flex justify-center">
              <FormAgregarProducto 
              categoryId={categoryId} 
              onSuccess={handleSuccess} />
            </DialogDescription>
          </DialogContent>
        </Dialog>
    )
}
export default AgregarProductoDialogo