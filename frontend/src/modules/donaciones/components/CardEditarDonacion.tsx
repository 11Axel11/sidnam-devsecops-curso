import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { cardEditarDonacionProps } from "../types/editarDonacionProps";
import { getAvatarSvg } from "@/components/app/avatarGenerator";
import { useNavigate, useParams } from "@tanstack/react-router";
import { usePatchEditarRegistroDonacion } from "../hooks/gestionDonacion/gestionDonacionesHooks";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { CardDescription } from "@/components/ui/card";
import { useForm } from "@tanstack/react-form";
import { crearRegistroDonacionSchema } from "@/schemas/schemaDonaciones";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/animate-ui/radix/accordion";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const CardEditarDonacion = ({ registro }: cardEditarDonacionProps) => {
    const navigate = useNavigate();
    const { editable } = useParams({
        from: "/donaciones/gestion/editar/$editable",
    });

    const patchRegistroDonacion = usePatchEditarRegistroDonacion();
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const gotoInicio = (id: number) => {
        const idNum = Number(id);

        navigate({
            to: "/donaciones/gestion/$id",
            params: { id: idNum },
        });
    };

    const form = useForm({
        defaultValues: registro,

        onSubmit: async ({ value }) => {
            setFormErrors({});

            const result = crearRegistroDonacionSchema.safeParse(value);
            if (!result.success) {
                const fieldErrors: Record<string, string> = {};
                result.error.issues.forEach((err) => {
                    const field = err.path[0] as string;
                    fieldErrors[field] = err.message;
                });
                setFormErrors(fieldErrors);
                return;
            }

            try {
                await patchRegistroDonacion.mutateAsync({
                    idRegistro: Number(editable),
                    registroEditado: value,
                });
                gotoInicio(Number(editable));
                toast.success("Donación editada", {
                    description: "Puedes visualizar la donación editada.",
                    duration: 4000,
                });

            } catch (err: any) {
                // Extract error message from API response
                const errorMessage = err.response?.data?.message 
                    || err.response?.data?.error 
                    || err.message 
                    || "Error en el servidor, por favor intenta más tarde";
                
                if (err.response?.status === 401) {
                    setFormErrors({ credentials: "Credenciales incorrectas" });
                } else {
                    setFormErrors({ server: errorMessage });
                }
                
                toast.error("Error al editar donación", {
                    description: errorMessage,
                    duration: 5000,
                });
            }
        },
    });
    
    return (
        <div className="flex justify-center">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
            >
                <Card className="w-5xl mt-3">
                    <CardHeader>
                        <CardDescription className="text-right flex items-center gap-2 justify-end">
                            <Pencil size={16} />
                            Modo edición
                        </CardDescription>

                        <div className="flex gap-6 items-center text-justify">
                            <img
                                src={getAvatarSvg(registro.tipoDonacion ?? "", "")}
                                alt={`Avatar de ${registro.tipoDonacion}`}
                                className="w-23 h-23 rounded-full"
                            />
                            <CardTitle className="flex items-center justify-between w-4xl">
                                <div>
                                    <div className="text-xl">{registro.tipoDonacion}</div>

                                    <form.Field 
                                        name="anonimo" 
                                        children={(field: { state: { value: boolean | undefined; }; handleChange: (arg0: boolean) => void; }) => (
                                        <div className="my-2">
                                            <div className="flex items-center align-middle gap-2">
                                                <label htmlFor="anonimo" className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                                    <div className="relative">
                                                        <input
                                                            id="anonimo"
                                                            type="checkbox"
                                                            className="absolute opacity-0 h-0 w-0"
                                                            checked={field.state.value}
                                                            onChange={(e) => field.handleChange(e.target.checked)}
                                                        />
                                                        <span className={`
                                                            h-3 w-3 rounded border border-gray-300 
                                                            flex items-center justify-center flex-shrink-0
                                                            ${field.state.value ? 'bg-amaranthPink border-amaranthPink' : 'bg-white'}
                                                        `}>
                                                            {field.state.value && (
                                                                <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <span>El donante desea que su donación sea anónima</span>
                                                </label>
                                            </div>
                                            {formErrors.anonimo && (
                                                <p className="text-red-700 text-sm mt-1">{formErrors.anonimo}</p>
                                            )}
                                        </div>
                                    )} />
                                </div>
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <Accordion
                            type="multiple"
                            defaultValue={[
                                "informacion-contacto",
                                "informacion-donacion",
                                "observaciones"
                            ]}
                        >
                            <AccordionItem value="informacion-contacto">
                                <AccordionTrigger className=" text-left hover:cursor-pointer text-md">
                                    Información de contacto
                                </AccordionTrigger>
                                <AccordionContent>
                                    <hr />
                                    <div className="grid grid-cols-2 gap-4 my-4">
                                        {/* First Row */}
                                        <div className="space-y-2">
                                            <form.Field
                                                name="nombre"
                                                validators={{
                                                    onChangeAsyncDebounceMs: 500,
                                                }}
                                                children={(field) => (
                                                    <div className="flex items-center gap-4">
                                                        <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left" htmlFor="nombre">
                                                            Nombre:
                                                        </Label>
                                                        <div className="flex-1">
                                                            <Input
                                                                id="nombre"
                                                                type="text"
                                                                className="w-full"
                                                                maxLength={50}
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                            />
                                                            {formErrors.nombre && (
                                                                <p className="text-red-700 text-sm mt-1">
                                                                    {formErrors.nombre}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <form.Field
                                                name="apellido1"
                                                validators={{
                                                    onChangeAsyncDebounceMs: 500,
                                                }}
                                                children={(field) => (
                                                    <div className="flex items-center gap-4">
                                                        <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left" htmlFor="apellido1">
                                                            Primer Apellido:
                                                        </Label>
                                                        <div className="flex-1">
                                                            <Input
                                                                id="apellido1"
                                                                type="text"
                                                                className="w-full"
                                                                maxLength={50}
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                            />
                                                            {formErrors.apellido1 && (
                                                                <p className="text-red-700 text-sm mt-1">
                                                                    {formErrors.apellido1}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        {/* Second Row */}
                                        <div className="space-y-2">
                                            <form.Field
                                                name="apellido2"
                                                validators={{
                                                    onChangeAsyncDebounceMs: 500,
                                                }}
                                                children={(field) => (
                                                    <div className="flex items-center gap-4">
                                                        <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left" htmlFor="apellido2">
                                                            Segundo Apellido:
                                                        </Label>
                                                        <div className="flex-1">
                                                            <Input
                                                                id="apellido2"
                                                                type="text"
                                                                className="w-full"
                                                                maxLength={50}
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                            />
                                                            {formErrors.apellido2 && (
                                                                <p className="text-red-700 text-sm mt-1">
                                                                    {formErrors.apellido2}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <form.Field
                                                name="cedula"
                                                validators={{ onChangeAsyncDebounceMs: 500 }}
                                                children={(field) => (
                                                    <div className="flex items-center gap-4">
                                                        <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left" htmlFor="cedula">
                                                            Cédula:
                                                        </Label>
                                                        <div className="flex-1">
                                                            <Input
                                                                id="cedula"
                                                                type="text"
                                                                className="w-full"
                                                                maxLength={12}
                                                                pattern="[0-9]{9,12}"
                                                                placeholder="Ingrese la cédula sin guiones ni espacios"
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                            />
                                                            {formErrors.cedula && (
                                                                <p className="text-red-700 text-sm mt-1">
                                                                    {formErrors.cedula}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        {/* Third Row */}
                                        <div className="space-y-2">
                                            <form.Field
                                                name="telefono"
                                                validators={{ onChangeAsyncDebounceMs: 500 }}
                                                children={(field) => (
                                                    <div className="flex items-center gap-4">
                                                        <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left" htmlFor="telefono">
                                                            Teléfono:
                                                        </Label>
                                                        <div className="flex-1">
                                                            <Input
                                                                id="telefono"
                                                                type="tel"
                                                                inputMode="tel"
                                                                maxLength={16}
                                                                className="w-full"
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                            />
                                                            {formErrors.telefono && (
                                                                <p className="text-red-700 text-sm mt-1">
                                                                    {formErrors.telefono}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <form.Field
                                                name="email"
                                                validators={{ onChangeAsyncDebounceMs: 500 }}
                                                children={(field) => (
                                                    <div className="flex items-center gap-4">
                                                        <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left" htmlFor="email">
                                                            Correo electrónico:
                                                        </Label>
                                                        <div className="flex-1">
                                                            <Input
                                                                id="email"
                                                                type="email"
                                                                className="w-full"
                                                                maxLength={200}
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                            />
                                                            {formErrors.email && (
                                                                <p className="text-red-700 text-sm mt-1">
                                                                    {formErrors.email}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="informacion-donacion">
                                <AccordionTrigger className="hover:cursor-pointer text-md">
                                    Información de donación
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4">
                                        <form.Field 
                                            name="tipoDonacion"
                                            validators={{ onChangeAsyncDebounceMs: 500 }}
                                            children={(field) => (
                                                <div className="flex items-center gap-4">
                                                    <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left" htmlFor="tipoDonacion">
                                                        Tipo de donación:
                                                    </Label>
                                                    <div className="flex-1">
                                                        <Input
                                                            id="tipoDonacion"
                                                            type="text"
                                                            className="w-full"
                                                            maxLength={30}
                                                            value={field.state.value}
                                                            onChange={(e) => field.handleChange(e.target.value)}
                                                        />
                                                        {formErrors.tipoDonacion && (
                                                            <p className="text-red-700 text-sm mt-1">
                                                                {formErrors.tipoDonacion}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        />

                                        <form.Field 
                                            name="descripcion"
                                            validators={{ onChangeAsyncDebounceMs: 500 }}
                                            children={(field) => (
                                                <div className="flex items-start gap-4">
                                                    <Label className="font-semibold text-sm w-32 flex-shrink-0 pt-2 text-left" htmlFor="descripcion">
                                                        Descripción:
                                                    </Label>
                                                    <div className="flex-1">
                                                        <Textarea
                                                            id="descripcion"
                                                            className="w-full"
                                                            maxLength={200}
                                                            value={field.state.value}
                                                            onChange={(e) => field.handleChange(e.target.value)}
                                                        />
                                                        {formErrors.descripcion && (
                                                            <p className="text-red-700 text-sm mt-1">
                                                                {formErrors.descripcion}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="observaciones">
                                <AccordionTrigger className="hover:cursor-pointer text-md">
                                    Observaciones
                                </AccordionTrigger>
                                <AccordionContent>
                                    <form.Field 
                                        name="observaciones"
                                        validators={{ onChangeAsyncDebounceMs: 500 }}
                                        children={(field) => (
                                            <div className="flex items-start gap-4">
                                                <Label className="font-semibold text-sm w-32 flex-shrink-0 text-left pt-2" htmlFor="observaciones">
                                                    Observaciones:
                                                </Label>
                                                <div className="flex-1">
                                                    <Textarea
                                                        id="observaciones"
                                                        className="w-full"
                                                        maxLength={200}
                                                        value={field.state.value}
                                                        onChange={(e) => field.handleChange(e.target.value)}
                                                    />
                                                    {formErrors.observaciones && (
                                                        <p className="text-red-700 text-sm mt-1">
                                                            {formErrors.observaciones}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                    <CardFooter className="flex items-center gap-4">
                        <CardAction className="flex gap-4 w-full justify-end mr-4">
                        <Button variant={"approve"} type="submit">
                            Aceptar
                        </Button>
                        <Button variant={"secondary"} onClick={() => gotoInicio(editable)}>Cancelar</Button>
                        </CardAction>
                    </CardFooter>
                </Card>
            </form>
            
        </div>
    );
};
export default CardEditarDonacion;