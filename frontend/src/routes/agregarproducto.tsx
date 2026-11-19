import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSalidasStore } from "@/store/salidasStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import WebLoader from "@/components/Loader";
import { useGetInventarioAllProductos, useGetInventarioAllProductosSubCategorias, useGetSubCategorias } from "@/modules/inventarios/hooks/inventarioHooks";
import type { InventarioProductoSalidas } from "@/modules/inventarios/models/inventario";
import { Search } from "lucide-react";
import { ensurePerms, makeCan } from "@/services/authHelpers";

export const Route = createFileRoute('/agregarproducto')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): { inventarioId?: string } => {
    return {
      inventarioId: search.inventarioId as string | undefined
    }
  },
  beforeLoad: async ({ context, location }) => {
        const perms = await ensurePerms(context.queryClient)
        const { canAny } = makeCan(perms)
        const ok = canAny([
          'Inventariado.Salidas:Ver',
          'Inventariado.Salidas:Actualizar',
          'Inventariado.Salidas:Eliminar',
        ])
        if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
      },
})

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

function CardItem({ item, onClick }: { item: InventarioProductoSalidas; onClick: () => void }) {
  return (
    <Button
      className="w-3/4 md:w-full h-60 m-2 flex sm:flex-col border-gray-300 items-center justify-center"
      variant="outline"
      onClick={onClick}
    >
      <div className="sm:h-32 sm:w-32 bg-gray-100 rounded-xl mb-3 overflow-hidden">
        <img 
          src={item.imagen} 
          alt={item.nombreProducto}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col items-center text-center gap-1">
        <p className="font-semibold text-wrap text-xl leading-tight">{item.nombreProducto} <span className="text-xl opacity-70"> • {item.nombreUnidadMedida} ({item.abreviaturaUnidadMedida})</span></p>
        <p className="text-xl opacity-70">Stock: {item.stock}</p>
      </div>
    </Button>
  );
}

function MobileCardItem({ item, onClick }: { item: InventarioProductoSalidas; onClick: () => void }) {
  return (
    <Button
      className="w-60 h-46 flex flex-col justify-evenly border-gray-300 items-center"
      variant="outline"
      onClick={onClick}
    >
      <div className="w-full">
        <p className="font-semibold text-wrap text-md leading-tight">{item.nombreProducto}</p>
      </div>
      <div className="flex justify-between items-center w-full h-20 overflow-hidden">
        <div className="w-20 h-20 bg-gray-100 rounded-sm overflow-hidden">
          <img 
            src={item.imagen} 
            alt={item.nombreProducto}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col items-center text-center gap-1 flex-1 ml-4 w-full max-w-[60%]">
          <p className="text-sm text-gray-600 w-full break-words whitespace-normal">
            {item.nombreUnidadMedida} ({item.abreviaturaUnidadMedida})
          </p>
          <p className="text-md text-gray-600 font-bold">Stock: {item.stock}</p>
        </div>
      </div>
    </Button>
  );
}

function RouteComponent() {
  const navigate = useNavigate();
  const addProducto = useSalidasStore((state) => state.addProducto);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const windowWidth = useWindowWidth();
  
  const { 
    inventarioAllProductos, 
    loadingInventarioAllProductos,
    errorInventarioAllProductos
  } = useGetInventarioAllProductos();
  
  const { 
    inventarioAllProductosSubCategorias, 
    loadingInventarioAllProductosSubCategorias,
    errorInventarioAllProductosSubCategorias,
    refetch: refetchSubcategoryProducts
  } = useGetInventarioAllProductosSubCategorias(selectedSubcategory || 0);
  
  const { subcategorias } = useGetSubCategorias();
  
  const displayProducts = selectedSubcategory === null 
    ? inventarioAllProductos 
    : inventarioAllProductosSubCategorias;
    
  const loading = selectedSubcategory === null 
    ? loadingInventarioAllProductos 
    : loadingInventarioAllProductosSubCategorias;
    
  const error = selectedSubcategory === null 
    ? errorInventarioAllProductos 
    : errorInventarioAllProductosSubCategorias;

  const filteredProductos = displayProducts?.filter(producto => {
    const matchesSearch = producto.nombreProducto.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  useEffect(() => {
    if (selectedSubcategory !== null) {
      refetchSubcategoryProducts();
    }
  }, [selectedSubcategory, refetchSubcategoryProducts]);

  useEffect(() => {
    if (error) {
      toast.error(error.message ?? "Error cargando productos");
    }
  }, [error]);

  const select = (i: InventarioProductoSalidas) => {
    addProducto({
      inventarioId: i.inventarioId,
      stock: i.stock,
      nombreProducto: i.nombreProducto,
      nombreUnidadMedida: i.nombreUnidadMedida,
      abreviaturaUnidadMedida: i.abreviaturaUnidadMedida,
      imagen: i.imagen,
      cantidad: 1,
    });
    toast.success(`${i.nombreProducto} agregado`);
    navigate({ to: "/salidas" });
  };

  if (loading) return <WebLoader />;

  return (
    <div className="min-h-screen w-full bg-amaranthPink grid place-items-center">
      <div className="w-9/10 max-w-5xl h-full max-h-[90vh] bg-white rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col">
        <div className="flex flex-col gap-4 items-center">
          <div className="mb-4 mt-6 bg-gray-200 p-2 rounded-xl w-full max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-0.5 w-max mx-auto">
              <Search className="h-5 sm:h-6 w-5 sm:w-6 text-gray-500 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Buscar producto" 
                className="bg-transparent border-none outline-none text-center w-full max-w-40 text-md sm:text-lg md:text-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 flex gap-2 flex-wrap justify-center">
            <Button 
              className={`border-gray-300 text-sm sm:text-md md:text-lg font-semibold py-4 md:py-6 w-23 sm:w-25 md:w-full min-w-20 max-w-40 h-12 md:h-0 ${selectedSubcategory === null ? 'bg-gray-200' : ''}`} 
              variant="outline"
              onClick={() => setSelectedSubcategory(null)}
            >
              Todos
            </Button>
            {subcategorias.map((subcategoria) => (
              <Button 
                key={subcategoria.id} 
                className={`border-gray-300 text-sm sm:text-md md:text-lg font-semibold py-4 md:py-6 w-23 sm:w-25 md:w-full min-w-20 max-w-40 h-12 md:h-0 truncate break-words ${selectedSubcategory === subcategoria.id ? 'bg-gray-200' : ''}`} 
                variant="outline"
                onClick={() => setSelectedSubcategory(subcategoria.id)}
              >
                {subcategoria.nombre}
              </Button>
            ))}
          </div>
        </div>

        <div className="max-h-96 md:max-h-[50vh] xl:max-h-[64vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-1 gap-y-10 pr-1 place-items-center mt-8">
          {filteredProductos?.map((item) => (
           windowWidth < 640 ? (
              <MobileCardItem key={item.inventarioId} item={item} onClick={() => select(item)} />
            ) : (
              <CardItem key={item.inventarioId} item={item} onClick={() => select(item)} />
            )
          ))}
          {filteredProductos?.length === 0 && !loading && (
            <div className="col-span-3 text-center text-gray-500 py-4">
              No se encontraron productos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
