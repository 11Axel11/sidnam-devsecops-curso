import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfirmModalStore } from "@/store/modalStore";
import { User, Trash2, Plus } from "lucide-react";
import type { EditarEncargadoResidente } from "../models/residente";
import { Label } from "@radix-ui/react-label";
import type { EditableEncargadosProps } from "../types/expedienteResidenteProps";

const EditableEncargados = ({ encargados, onChange }: EditableEncargadosProps) => {
    const openModal = useConfirmModalStore((state) => state.openModal);
    const [items, setItems] = useState<EditarEncargadoResidente[]>(encargados ?? []);
    const [adding, setAdding] = useState(false);
    const [localItem, setLocalItem] = useState<EditarEncargadoResidente>({
        cedula: "",
        nombre: "",
        apellido1: "",
        apellido2: "",
        correo: "",
        telefono: "",
    });

    useEffect(() => {
        setLocalItem({
            cedula: "",
            nombre: "",
            apellido1: "",
            apellido2: "",
            correo: "",
            telefono: "",
        });
    }, [adding]);

    const handleChange = (index: number, field: keyof EditarEncargadoResidente, value: string) => {
        const newItems = [...items];
        if (typeof newItems[index][field] !== "undefined") {
            newItems[index][field] = value as unknown as never;
        }
        setItems(newItems);
        onChange(newItems);
    };

    const confirmarEliminar = (index: number, nombre: string) => {
        openModal(
            `Esta acción eliminará permanentemente al encargado ${nombre}.`,
            () => eliminarEncargadoConfirmado(index),
            () => { },
            "destructive"
        );
    };

    const eliminarEncargadoConfirmado = (index: number) => {
        const nuevos = items.filter((_, i) => i !== index);
        setItems(nuevos);
        onChange(nuevos);
        toast.success("Encargado eliminado");
    };

    const agregarEncargado = () => {
        const nuevo = { ...localItem }; 
        const nuevos = [...items, nuevo];
        setItems(nuevos);
        onChange(nuevos);
        setAdding(false);
        toast.success("Encargado agregado");
    };

    return (
        <div className="w-full">
            {items.map((enc, i) => (
                <div key={enc.id || i} className="group mb-4 flex gap-4 items-start">
                    <User className="text-gray-400 mt-1 lg:ml-10" />
                    <div className="flex flex-col space-y-2 text-justify">
                        <div className="flex gap-2 mt-2">
                            <div className="flex items-center mb-4">
                                <Label className="font-semibold text-sm w-40">
                                    Cédula:
                                </Label>
                                <Input
                                    value={enc.cedula}
                                    onChange={(e) => handleChange(i, "cedula", e.target.value)}
                                    placeholder="Cédula"
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex items-center mb-4">
                                <Label className="font-semibold text-sm w-40">
                                    Nombre:
                                </Label>
                                <Input
                                    value={enc.nombre}
                                    onChange={(e) => handleChange(i, "nombre", e.target.value)}
                                    placeholder="Nombre"
                                    className="flex-1"
                                />
                            </div>

                        </div>

                        <div className="flex gap-2">
                            <div className="flex items-center mb-4">
                                <Label className="font-semibold text-sm w-40">
                                    Apellido 1:
                                </Label>
                                <Input
                                    value={enc.apellido1}
                                    onChange={(e) => handleChange(i, "apellido1", e.target.value)}
                                    placeholder="Apellido 1"
                                    className="flex-1"
                                />
                            </div>

                            <div className="flex items-center mb-4">
                                <Label className="font-semibold text-sm w-40">
                                    Apellido 2:
                                </Label>
                                <Input
                                    value={enc.apellido2}
                                    onChange={(e) => handleChange(i, "apellido2", e.target.value)}
                                    placeholder="Apellido 2"
                                    className="flex-1"
                                />
                            </div>
                        </div>


                        <div className="flex items-center mb-4">
                            <Label className="font-semibold text-sm w-40">
                                Correo electrónico:
                            </Label>
                            <Input
                                value={enc.correo}
                                onChange={(e) => handleChange(i, "correo", e.target.value)}
                                placeholder="Correo"
                                type="email"
                                className="flex-1"
                            />
                        </div>

                        <div className="flex items-center mb-4">
                            <Label className="font-semibold text-sm w-40">
                                Teléfono:
                            </Label>
                            <Input
                                value={enc.telefono}
                                onChange={(e) => handleChange(i, "telefono", e.target.value)}
                                placeholder="Teléfono"
                                className="flex-1"
                            />
                        </div>

                        <hr />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmarEliminar(i, `${enc.nombre} ${enc.apellido1}`)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
                        type="button"
                    >
                        <Trash2 size={14} className="text-red-500" />
                    </Button>
                </div>
            ))}

            {adding && (
                <div className="mb-4 flex gap-4 flex-col lg:ml-10">
                    <div className="flex gap-4 ">
                        <User className="text-gray-400 mt-1" />
                        <div className="flex flex-col space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={localItem.nombre}
                                    onChange={(e) => setLocalItem({ ...localItem, nombre: e.target.value })}
                                    placeholder="Nombre"
                                    className="flex-1"
                                />
                                <Input
                                    value={localItem.apellido1}
                                    onChange={(e) => setLocalItem({ ...localItem, apellido1: e.target.value })}
                                    placeholder="Apellido 1"
                                    className="flex-1"
                                />
                                <Input
                                    value={localItem.apellido2}
                                    onChange={(e) => setLocalItem({ ...localItem, apellido2: e.target.value })}
                                    placeholder="Apellido 2"
                                    className="flex-1"
                                />
                            </div>
                            <Input
                                value={localItem.cedula}
                                onChange={(e) => setLocalItem({ ...localItem, cedula: e.target.value })}
                                placeholder="Cédula"
                            />
                            <Input
                                value={localItem.correo}
                                onChange={(e) => setLocalItem({ ...localItem, correo: e.target.value })}
                                placeholder="Correo"
                            />
                            <Input
                                value={localItem.telefono}
                                onChange={(e) => setLocalItem({ ...localItem, telefono: e.target.value })}
                                placeholder="Teléfono"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-start">
                        <Button onClick={agregarEncargado} variant="approve" size="sm">
                            Guardar
                        </Button>
                        <Button onClick={() => setAdding(false)} variant="outline" size="sm">
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {!adding && (
                <Button
                    onClick={() => setAdding(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 mt-4"
                >
                    <Plus size={16} /> Agregar Encargado
                </Button>
            )}

            {items.length === 0 && !adding && (
                <div className="flex items-center gap-2 text-gray-500 mt-2">
                    <User className="text-gray-400" /> No hay encargados registrados
                </div>
            )}
        </div>
    );
};

export default EditableEncargados;
