import { useMemo, useState } from "react";
import { BookOpenText, Download } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthz } from "@/hooks/useAuth";
import manualesUsuarioRaw from "@/data/manuales-usuario.json?raw";

type ManualUsuarioItem = {
    id: string;
    titulo: string;
    modulo: string;
    driveLink?: string;
    anyOf: string[];
};

const MANUALES_USUARIO = JSON.parse(manualesUsuarioRaw) as ManualUsuarioItem[];

function extractGoogleDriveFileId(url: string) {
    try {
        const parsed = new URL(url);

        const byQuery = parsed.searchParams.get("id");
        if (byQuery) return byQuery;

        const byPath = parsed.pathname.match(/\/file\/d\/([^/]+)/);
        if (byPath?.[1]) return byPath[1];

        return null;
    } catch {
        return null;
    }
}

export default function DialogManualesUsuario() {
    const [open, setOpen] = useState(false);
    const { canAny, isLoading } = useAuthz({ ignoreWildcard: true, normalize: true });

    const manualesVisibles = useMemo(() => {
        if (isLoading) return [];
        return MANUALES_USUARIO.filter((manual) => canAny(manual.anyOf));
    }, [canAny, isLoading]);

    const onDescargarManual = (manual: ManualUsuarioItem) => {
        if (!manual.driveLink) {
            toast.error("Este manual aun no tiene link de descarga.");
            return;
        }

        const fileId = extractGoogleDriveFileId(manual.driveLink);
        if (!fileId) {
            toast.error("No se pudo leer el ID del archivo en Google Drive.");
            return;
        }

        const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        window.open(directDownloadUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Card className="flex hover:cursor-pointer items-center gap-2 p-4">
                    <BookOpenText className="text-primary" />
                    Manuales de usuario
                </Card>
            </DialogTrigger>

            <DialogContent className="w-full max-w-lg sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manuales de usuario</DialogTitle>
                    <DialogDescription>
                        Selecciona el modulo del manual que deseas descargar.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                    </div>
                ) : manualesVisibles.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">
                        No hay manuales disponibles para tus permisos actuales.
                    </p>
                ) : (
                            <div className="space-y-2 max-h-[60vh] overflow-auto scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent px-2">
                        {manualesVisibles.map((manual) => (
                            <div
                                key={manual.id}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded gap-3"
                            >
                                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                                    <p className="font-medium truncate">{manual.titulo}</p>
                                    <p className="text-sm text-gray-500">Consulte la información aquí</p>
                                </div>

                                <Button
                                    variant="read"
                                    size="sm"
                                    onClick={() => onDescargarManual(manual)}
                                    className="shrink-0 w-full sm:w-auto flex items-center justify-center"
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="ml-2">Descargar manual</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
