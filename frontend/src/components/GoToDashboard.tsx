import { SquareArrowOutUpLeft } from "lucide-react"
import { Button } from "./ui/button"
import { useNavigate } from "@tanstack/react-router";
import { useSalidasStore } from "@/store/salidasStore";
import { useEffect, useState } from "react";

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

const GoToDashboard = () => {
    const navigate = useNavigate();
    const { clearProductos } = useSalidasStore();
    const windowWidth = useWindowWidth();
  return (
    <div className="">
        <Button 
            variant="outline" 
            className="flex items-center gap-2 sm:p-6 text-sm sm:text-lg xl:text-sm font-semibold xl:p-4"
            onClick={() => {
                clearProductos();
                navigate({ to: "/" });
            }}
        >
          <SquareArrowOutUpLeft className="h-3 sm:h-4 w-3 sm:w-4 xl:h-2 xl:w-2" />
          {windowWidth >= 640 ? "Volver al inicio" : "Volver"}
        </Button>
    </div>
  )
}

export default GoToDashboard