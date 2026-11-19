import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { useForm, useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { CirclePlus, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { defaultValuesSolicitudVoluntariado } from "../models/accionesExpediente";
import { usePostSolicitudVoluntario } from "../hooks/solicitudesVoluntariado/solicitudesHooks";
import { useGetTiposVoluntariado } from "../hooks/voluntariadoHooks";
import { crearExpedienteVoluntariadoSchema } from "../schemas/schemaVoluntariado";

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const generarHoras = () => {
  const times: string[] = [];
  for (let h = 7; h <= 17; h++) {
    times.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 17) times.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return times;
};

const FormularioVoluntariado = () => {
  const navigate = useNavigate();
  const formMutation = usePostSolicitudVoluntario();
  const { idUsuario } = useAuth();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { tipoVoluntario } = useGetTiposVoluntariado();
  const horas = generarHoras();

  const form = useForm({
    defaultValues: defaultValuesSolicitudVoluntariado,
    onSubmit: async ({ value }) => {
      setFormErrors({});

      const result = crearExpedienteVoluntariadoSchema.safeParse({
        ...value,
        tipoVoluntariado: Number(value.tipoVoluntariado),
        cantidadHoras: Number(value.cantidadHoras),
        contactosEmergencia: value.contactosEmergencia.map((c) => ({
          nombre: c.nombre,
          telefono: c.telefono,
        })),
      });

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path.map(String).join(".");
          fieldErrors[key] = issue.message;
        }
        setFormErrors(fieldErrors);
        return;
      }

      if (idUsuario == null) {
        setFormErrors({ server: "No se pudo identificar al usuario." });
        return;
      }

        try {
        const horariosCompletos = (result.data.horarios ?? []).filter(
          (h) => h.dia && h.horaInicio && h.horaFin
        );

        await formMutation.mutateAsync({
          idUsuario,
          solicitud: {
            ...result.data,
            tipoVoluntariado: Number(result.data.tipoVoluntariado),
            cantidadHoras: result.data.cantidadHoras || 0,
            contactosEmergencia: result.data.contactosEmergencia.map((c, idx) => ({
              id: idx + 1,
              nombre: c.nombre,
              telefono: c.telefono,
            })),
            horarios: horariosCompletos.map((h, idx) => ({
              id: idx + 1,
              dia: h.dia,
              horaInicio: h.horaInicio,
              horaFin: h.horaFin,
            })),
          },
        });
        navigate({ to: "/voluntarios/gestion" });
        toast.success("Expediente creado", {
          description:
            "Puedes visualizar este expediente en el apartado de gestión de expedientes de voluntarios",
          duration: 4000,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.response?.status === 401) {
          setFormErrors({ credentials: "Credenciales incorrectas" });
        } else if (err.response?.status === 400) {
          toast.warning("No puedes hacer eso", {
            description:
              err.response?.data?.message || "Hay un expediente activo con esa cédula",
            duration: 4000,
          });
        } else {
          setFormErrors({
            server: "Error en el servidor, por favor intenta más tarde",
          });
        }
      }
    },
  });

  const tipoSeleccionadoId = useStore(form.store, (state) => state.values.tipoVoluntariado);
  const tipoSeleccionado = tipoVoluntario?.find((tipo) => tipo.id === tipoSeleccionadoId);
  const tipoNombre = tipoSeleccionado?.nombre?.toLowerCase() ?? "";
  const isHoras = tipoNombre.includes("hora") || tipoNombre.includes("tcu");

  useEffect(() => {
    if (!isHoras) {
      form.setFieldValue("cantidadHoras", 0);
    }
  }, [isHoras, form]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <Card className="w-4xl">
        <CardHeader>
          <CardTitle>Crea un nuevo expediente de un voluntario</CardTitle>
          <CardDescription>
            Si hay un voluntario que haya presentado su solicitud personalmente
            al Hogar, puedes crear su expediente en el sistema aqui
          </CardDescription>
        </CardHeader>

        <CardContent className="text-justify ">
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
                    maxLength={15}
                    type="string"
                    value={field.state.value}
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
              children={(field: {
                state: {
                  value: string | number | readonly string[] | undefined;
                };
                handleChange: (arg0: string) => void;
              }) => (
                <div className="mb-4">
                  <Label className="font-semibold" htmlFor="apellido1">
                    Primer Apellido:
                  </Label>
                  <Input
                    id="apellido1"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.apellido1 && (
                    <p className="text-red-700 text-sm">
                      {formErrors.apellido1}
                    </p>
                  )}
                </div>
              )}
            />
            <form.Field
              name="apellido2"
              validators={{ onChangeAsyncDebounceMs: 500 }}
              children={(field: {
                state: {
                  value: string | number | readonly string[] | undefined;
                };
                handleChange: (arg0: string) => void;
              }) => (
                <div className="mb-4">
                  <Label className="font-semibold " htmlFor="apellido2">
                    Segundo Apellido:
                  </Label>
                  <Input
                    id="apellido2"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.apellido2 && (
                    <p className="text-red-700 text-sm">
                      {formErrors.apellido2}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="email"
              validators={{ onChangeAsyncDebounceMs: 500 }}
              children={(field: {
                state: {
                  value: string | number | readonly string[] | undefined;
                };
                handleChange: (arg0: string) => void;
              }) => (
                <div className="mb-4">
                  <Label className="font-semibold " htmlFor="email">
                    Correo electrónico:
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.email && (
                    <p className="text-red-700 text-sm">{formErrors.email}</p>
                  )}
                </div>
              )}
            />
            <form.Field
              name="telefono"
              validators={{ onChangeAsyncDebounceMs: 500 }}
              children={(field: {
                state: {
                  value: string | number | readonly string[] | undefined;
                };
                handleChange: (arg0: string) => void;
              }) => (
                <div className="mb-4">
                  <Label className="font-semibold " htmlFor="telefono">
                    Teléfono:
                  </Label>
                  <Input
                    id="telefono"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.telefono && (
                    <p className="text-red-700 text-sm">
                      {formErrors.telefono}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="ocupacion"
              validators={{ onChangeAsyncDebounceMs: 500 }}
              children={(field: {
                state: { value: string | number | readonly string[] | undefined };
                handleChange: (arg0: string) => void;
              }) => (
                <div className="mb-4">
                  <Label className="font-semibold " htmlFor="ocupacion">
                    Ocupación:
                  </Label>
                  <Input
                    id="ocupacion"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.ocupacion && (
                    <p className="text-red-700 text-sm">{formErrors.ocupacion}</p>
                  )}
                </div>
              )}
            />
            <form.Field
              name="direccion"
              validators={{ onChangeAsyncDebounceMs: 500 }}
              children={(field: {
                state: { value: string | number | readonly string[] | undefined };
                handleChange: (arg0: string) => void;
              }) => (
                <div className="mb-4">
                  <Label className="font-semibold " htmlFor="direccion">
                    Dirección:
                  </Label>
                  <Input
                    id="direccion"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.direccion && (
                    <p className="text-red-700 text-sm">{formErrors.direccion}</p>
                  )}
                </div>
              )}
            />
          </div>
          <form.Field name="sexo">
            {(field) => (
              <div className="mb-4">
                <Label className="font-semibold mb-2 block" htmlFor="sexo">
                  Sexo:
                </Label>
                <RadioGroup
                  id="sexo"
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="F" id="sexoF" />
                    <Label htmlFor="sexoF">Femenino</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="M" id="sexoM" />
                    <Label htmlFor="sexoM">Masculino</Label>
                  </div>
                </RadioGroup>
                {formErrors.sexo && (
                  <p className="text-red-700 text-sm">{formErrors.sexo}</p>
                )}
              </div>
            )}
          </form.Field>
          <form.Field
            name="experienciaLaboral"
            validators={{ onChangeAsyncDebounceMs: 500 }}
            children={(field: {
              state: { value: string | number | readonly string[] | undefined };
              handleChange: (arg0: string) => void;
            }) => (
              <div className="mb-4">
                <Label className="font-semibold " htmlFor="experienciaLaboral">
                  Experiencia Laboral o voluntaria relacionada a adultos mayores:
                </Label>
                <Input
                  id="experienciaLaboral"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors.experienciaLaboral && (
                  <p className="text-red-700 ">
                    {formErrors.experienciaLaboral}
                  </p>
                )}
              </div>
            )}
          />

          <form.Field
            name="contactosEmergencia"
            validators={{ onChangeAsyncDebounceMs: 500 }}
          >
            {(field) => {
              const contacto =
                Array.isArray(field.state.value) && field.state.value.length > 0
                  ? field.state.value[0]
                  : { nombre: "", telefono: "" };

              const handleContactChange = (
                key: "nombre" | "telefono",
                value: string
              ) => {
                const updatedContact = { ...contacto, [key]: value };
                field.handleChange([updatedContact]);
              };

              return (
                <div className="mb-4">
                  <Label className="font-semibold block mb-2" htmlFor="contacto-nombre">
                    Contacto de Emergencia:
                  </Label>

                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contacto-nombre" className="font-semibold block mb-1">
                        Nombre:
                      </Label>
                      <Input
                        id="contacto-nombre"
                        type="text"
                        value={contacto.nombre}
                        onChange={(e) => handleContactChange("nombre", e.target.value)}
                        placeholder="Nombre del contacto"
                      />
                      {formErrors["contactosEmergencia.0.nombre"] && (
                        <p id="error-contacto-nombre" className="text-red-700 text-sm mt-1">
                          {formErrors["contactosEmergencia.0.nombre"]}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="contacto-telefono" className="font-semibold block mb-1">
                        Teléfono:
                      </Label>
                      <Input
                        id="contacto-telefono"
                        type="tel"
                        value={contacto.telefono}
                        onChange={(e) => handleContactChange("telefono", e.target.value)}
                        placeholder="Número de teléfono"
                      />
                      {formErrors["contactosEmergencia.0.telefono"] && (
                        <p id="error-contacto-telefono" className="text-red-700 text-sm mt-1">
                          {formErrors["contactosEmergencia.0.telefono"]}
                        </p>
                      )}
                    </div>
                  </div>

                  {formErrors["contactosEmergencia"] && (
                    <p className="text-red-700 text-sm mt-1">
                      {formErrors["contactosEmergencia"]}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <form.Field name="tipoVoluntariado">
            {(field) => (
              <div className="mb-4">
                <Label className="block mb-2 font-semibold">
                  Tipo de Voluntariado:
                </Label>
                <RadioGroup
                  value={String(field.state.value ?? "")}
                  onValueChange={(value) => field.handleChange(Number(value))}
                  className="flex gap-2"
                >
                  {tipoVoluntario?.map((tipo) => (
                    <div key={tipo.id} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={String(tipo.id)}
                        id={`tipo-${tipo.id}`}
                      />
                      <Label htmlFor={`tipo-${tipo.id}`}>{tipo.nombre}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </form.Field>

          {isHoras && (
            <form.Field name="cantidadHoras">
              {(field) => (
                <div className="mt-4 mr-6 ml-6">
                  <Label className="block text-left font-medium mb-2">
                    Cantidad de horas totales a cumplir:
                  </Label>
                  <Input
                    id="cantidadHoras"
                    type="numeric"
                    maxLength={10}
                    placeholder="Cantidad de horas"
                    value={field.state.value ?? 0}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </div>
              )}
            </form.Field>
          )}

          <form.Field
            name="horarios"
            validators={{ onChangeAsyncDebounceMs: 500 }}
            children={(field) => {
              const horarios = Array.isArray(field.state.value) ? field.state.value : [];

              const addHorario = () => {
                field.handleChange([...horarios, { dia: "", horaInicio: "", horaFin: "" }]);
              };

              const removeHorario = (index: number) => {
                const nuevos = horarios.filter((_, i) => i !== index);
                field.handleChange(nuevos);
              };

              const updateHorario = (index: number, key: "dia" | "horaInicio" | "horaFin", value: string) => {
                const nuevos = horarios.map((h, i) => (i === index ? { ...h, [key]: value } : h));
                field.handleChange(nuevos);
              };

              const diasUsadosPorIndex = horarios.map((_, index) => {
                return horarios
                  .filter((_, i) => i !== index)
                  .map((h) => h.dia)
                  .filter((d) => d);
              });

              return (
                <div className="mb-4">
                  <Label className="block mb-2 font-semibold">Horarios Disponibles</Label>

                  {horarios.length === 0 && (
                    <p className="text-gray-500 text-sm mb-2">No hay horarios agregados</p>
                  )}

                  {horarios.map((horario, index) => {
                    const diasUsados = diasUsadosPorIndex[index] || [];

                    const horasFinFiltradas = horario.horaInicio
                      ? horas.filter((h) => h > horario.horaInicio)
                      : horas;

                    return (
                      <div
                        key={index}
                        className="mb-3 p-3 border border-gray-200 rounded-md bg-gray-200/10"
                      >
                        <div className="flex justify-between mb-2">
                          <h4 className="text-sm font-medium">Horario {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeHorario(index)}
                            className="text-red-600 text-xs hover:cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 items-center">
                          <div>
                            <Label
                              htmlFor={`horario-dia-${index}`}
                              className="text-sm block mb-1"
                            >
                              Día
                            </Label>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="w-full text-left px-3 py-2 border rounded-md hover:cursor-pointer">
                                {horario.dia || "Seleccionar día"}
                              </DropdownMenuTrigger>

                              <DropdownMenuContent>
                                {dias.map((dia) => (
                                  <DropdownMenuItem
                                    key={dia}
                                    className={`hover:cursor-pointer ${diasUsados.includes(dia)
                                      ? "text-gray-400 pointer-events-none select-none"
                                      : ""
                                      }`}
                                    onSelect={() => updateHorario(index, "dia", dia)}
                                  >
                                    {dia}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* hora inicio */}
                          <div>
                            <Label
                              htmlFor={`horario-inicio-${index}`}
                              className="text-sm block mb-1"
                            >
                              Hora Inicio
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between text-black border border-gray-300"
                                >
                                  {horario.horaInicio || "--:--"}
                                  <Clock size={18} className="text-black" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="p-0 w-40 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
                                style={{ maxHeight: 200, overflowY: "auto" }}
                              >
                                <Command>
                                  <CommandGroup>
                                    {horas.map((time) => (
                                      <CommandItem
                                        key={time}
                                        value={time}
                                        onSelect={(value) =>
                                          updateHorario(index, "horaInicio", value)
                                        }
                                        className="cursor-pointer text-black hover:bg-gray-100"
                                      >
                                        {time}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* hora fin */}
                          <div>
                            <Label
                              htmlFor={`horario-fin-${index}`}
                              className="text-sm block mb-1"
                            >
                              Hora Fin
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between text-black border border-gray-300"
                                  disabled={!horario.horaInicio}
                                >
                                  {horario.horaFin || "--:--"}
                                  <Clock size={18} className="text-black" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="p-0 w-40 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
                                style={{ maxHeight: 200, overflowY: "auto" }}
                              >
                                <Command>
                                  <CommandGroup>
                                    {horasFinFiltradas.map((time) => (
                                      <CommandItem
                                        key={time}
                                        value={time}
                                        onSelect={(value) =>
                                          updateHorario(index, "horaFin", value)
                                        }
                                        className="cursor-pointer text-black hover:bg-gray-100"
                                      >
                                        {time}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-center w-full">
                    <button
                      type="button"
                      onClick={addHorario}
                      className="flex items-center gap-3 hover:cursor-pointer mt-2 py-1 px-3 bg-blue-100 text-blue-700 text-sm rounded-md"
                      disabled={horarios.length >= dias.length}
                      title={
                        horarios.length >= dias.length
                          ? "No quedan días disponibles"
                          : undefined
                      }
                    >
                      <CirclePlus size={15} />
                      Agregar horario
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    Solo se guardarán los horarios donde todos los campos estén completos.
                  </p>
                  {formErrors.horarios && (
                    <p className="text-red-700 text-sm mt-1">
                      {formErrors.horarios}
                    </p>
                  )}
                </div>
              );
            }}
          />

          <form.Field
            name="observaciones"
            validators={{ onChangeAsyncDebounceMs: 500 }}
            children={(field: {
              state: { value: string | number | readonly string[] | undefined };
              handleChange: (arg0: string) => void;
            }) => (
              <div className="mb-4">
                <Label className="font-semibold " htmlFor="observaciones">
                  Observaciones
                </Label>
                <Input
                  id="observaciones"
                  type="text"
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
            Crear expediente
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default FormularioVoluntariado;
