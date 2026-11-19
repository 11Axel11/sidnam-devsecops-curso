import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePostCrearRegistroDonacion } from "../hooks/gestionDonacion/gestionDonacionesHooks";
import { useForm } from "@tanstack/react-form";
import { defaultValuesCrearRegistroDonacion } from "../models/accionesRegistro";
import { crearRegistroDonacionSchema } from "@/schemas/schemaDonaciones";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FormularioRegistroDonacion = () => {
    const navigate = useNavigate();
    const formMutation = usePostCrearRegistroDonacion();
    const { idUsuario } = useAuth();
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const form = useForm({
        defaultValues: defaultValuesCrearRegistroDonacion,
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

            if (idUsuario == null) {
                setFormErrors({ server: "No se pudo identificar al usuario." });
                return;
            }

            try {
                await formMutation.mutateAsync({
                    idUsuario,
                    registro: result.data,
                });
                navigate({ to: "/donaciones/gestion" });
                toast.success("Registro de donación creado", {
                    description:
                        "Puedes visualizar esta donación en el apartado de gestión de registros de donaciones",
                    duration: 4000,
                });

            } catch (err: any) {
                if (err.response?.status === 401) {
                    setFormErrors({ credentials: "Credenciales incorrectas" });
                } else {
                    setFormErrors({ server: "Error en el servidor, por favor intenta más tarde" });
                }
            }
        }
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                form.handleSubmit();
            }}
        >
            <Card className="w-4xl">
                <CardHeader>
                    <CardTitle>Ingresar un registro de donación</CardTitle>
                    <CardDescription>
                        Si hay un donante que haya presentado su donación personalmente
                        al Hogar, puedes registrar esa donación en el sistema aquí. Esta se marcará como recibida de forma inmediata.
                    </CardDescription>
                </CardHeader>

                <CardContent className="text-justify">
                    <div className="grid grid-cols-2 gap-4">
                        <form.Field
                            name="cedula"
                            validators={{ onChangeAsyncDebounceMs: 500 }}
                            children={(field) => (
                                <div className="mb-4">
                                    <Label className="font-semibold " htmlFor="cedula">
                                        Cédula:
                                    </Label>
                                    <Input
                                        id="cedula"
                                        type="text"
                                        value={field.state.value}
                                        maxLength={12}
                                        pattern="[0-9]{9,12}"
                                        placeholder="Ingrese la cédula sin guiones ni espacios"
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    {formErrors.cedula && (
                                        <p className="text-red-700 text-sm">{formErrors.cedula}</p>
                                    )}
                                </div>
                            )}
                        />
                        <form.Field
                            name="nombre"
                            validators={{ onChangeAsyncDebounceMs: 500 }}
                            children={(field: {
                                state: {
                                    value: string | number | readonly string[] | undefined;
                                };
                                handleChange: (arg0: string) => void;
                            }) => (
                                <div className="mb-4">
                                    <Label className="font-semibold " htmlFor="nombre">
                                        Nombre:
                                    </Label>
                                    <Input
                                        id="nombre"
                                        type="text"
                                        maxLength={50}
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    {formErrors.nombre && (
                                        <p className="text-red-700 text-sm">{formErrors.nombre}</p>
                                    )}
                                </div>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <form.Field 
                            name="apellido1" 
                            validators={{ onChangeAsyncDebounceMs: 500 }} 
                            children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold " htmlFor="apellido1">
                                    Primer Apellido:
                                </Label>
                                <Input
                                    id="apellido1"
                                    type="text"
                                    maxLength={50}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {formErrors.apellido1 && (
                                    <p className="text-red-700 text-sm">
                                        {formErrors.apellido1}
                                    </p>
                                )}
                            </div>
                        )} />
                        <form.Field 
                            name="apellido2" 
                            validators={{ onChangeAsyncDebounceMs: 500 }} 
                            children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold " htmlFor="apellido2">
                                    Segundo Apellido:
                                </Label>
                                <Input
                                    id="apellido2"
                                    type="text"
                                    maxLength={50}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {formErrors.apellido2 && (
                                    <p className="text-red-700 text-sm">
                                        {formErrors.apellido2}
                                    </p>
                                )}
                            </div>
                        )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <form.Field
                        name="telefono"
                        validators={{ onChangeAsyncDebounceMs: 500 }}
                        children={(field) => (
                            <div className="mb-4">
                            <Label className="font-semibold" htmlFor="telefono">
                                Teléfono
                            </Label>

                            <Input
                                id="telefono"
                                type="tel"
                                inputMode="tel"
                                maxLength={16}
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />

                            {formErrors.telefono && (
                                <p className="text-red-700 text-sm mt-1">
                                {formErrors.telefono}
                                </p>
                            )}
                            </div>
                        )}
                        />
                        <form.Field 
                            name="email" 
                            validators={{ onChangeAsyncDebounceMs: 500 }} 
                            children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold " htmlFor="email">
                                    Correo electrónico:
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    maxLength={200}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {formErrors.email && (
                                    <p className="text-red-700 text-sm">
                                        {formErrors.email}
                                    </p>
                                )}
                            </div>
                        )} />
                    </div>
                    <form.Field name="anonimo" children={(field: { state: { value: boolean | undefined; }; handleChange: (arg0: boolean) => void; }) => (
                        <div className="mb-4">
                            <div className="flex items-center gap-2">
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
                                            h-4 w-4 rounded border border-gray-300 
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
                    <form.Field 
                        name="tipoDonacion"
                        validators={{ onChangeAsyncDebounceMs: 500 }}
                        children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold " htmlFor="tipoDonacion">
                                    Tipo de donación:
                                </Label>
                                <Input
                                    id="tipoDonacion"
                                    type="text"
                                    maxLength={30}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {formErrors.tipoDonacion && (
                                    <p className="text-red-700 text-sm">
                                        {formErrors.tipoDonacion}
                                    </p>
                                )}
                            </div>
                        )}
                        />
                        <form.Field 
                            name="descripcion"
                            validators={{ onChangeAsyncDebounceMs: 500 }}
                            children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold " htmlFor="descripcion">
                                    Descripción de los artículos donados:
                                </Label>
                                <Input
                                    id="descripcion"
                                    type="text"
                                    maxLength={200}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {formErrors.descripcion && (
                                    <p className="text-red-700 text-sm">
                                        {formErrors.descripcion}
                                    </p>
                                )}
                            </div>
                        )}
                        />
                        <form.Field 
                            name="observaciones"
                            validators={{ onChangeAsyncDebounceMs: 500 }}
                            children={(field) => (
                            <div className="mb-4">
                                <Label className="font-semibold " htmlFor="observaciones">
                                    Observaciones:
                                </Label>
                                <Input
                                    id="observaciones"
                                    type="text"
                                    maxLength={200}
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                />
                                {formErrors.observaciones && (
                                    <p className="text-red-700 text-sm">
                                        {formErrors.observaciones}
                                    </p>
                                )}
                            </div>
                        )}
                        />
                </CardContent>

                <CardFooter className="flex items-center gap-4">
                    <Button variant={"create"} onClick={form.handleSubmit} className="flex-1" type="submit">
                        Crear registro
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}; export default FormularioRegistroDonacion;