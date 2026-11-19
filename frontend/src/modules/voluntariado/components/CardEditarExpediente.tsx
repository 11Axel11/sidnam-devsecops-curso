import { getAvatarSvg } from "@/components/app/avatarGenerator";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { useEditarVoluntariado } from "../hooks/gestionVoluntariado/gestionHooks";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useNavigate, useParams } from "@tanstack/react-router";
import { editarExpedienteSchema } from "@/modules/voluntariado/schemas/schemaVoluntariado";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Horario } from "../models/voluntario";
import EditableHorario from "./EditableHorario";
import type { cardEditarExpedienteProps } from "../types/editarVoluntarioProps";
import axios from "axios";

const CardEditarExpediente = ({ expediente }: cardEditarExpedienteProps) => {
  const navigate = useNavigate();
  const { editable } = useParams({
    from: "/voluntarios/gestion/editar/$editable",
  });
  const [serverApplied, setServerApplied] = useState(false);
  const patchExpediente = useEditarVoluntariado();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getBackendErrorMessage = (data: unknown): string | null => {
    if (!data) return null;
    if (typeof data === "string") return data;

    if (typeof data === "object") {
      const payload = data as Record<string, unknown>;

      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }

      if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    }

    return null;
  };

  const gotoInicio = (id: number) => {
    const idNum = Number(id);

    navigate({
      to: "/voluntarios/gestion/$id",
      params: { id: idNum },
    });
  };

  const form = useForm({
    defaultValues: {
      ...expediente,
      horarios: expediente.horarios ?? [],
    },

    onSubmit: async ({ value }) => {
      setFormErrors({});

      const result = editarExpedienteSchema.safeParse(value);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setFormErrors(fieldErrors);
        toast.error("Revisa los campos del formulario", {
          description: "Hay datos inválidos o incompletos.",
          duration: 4000,
        });
        return;
      }

      if (value.horarios) {
        value.horarios = value.horarios.map(({ id, ...rest }) => {
          if (!id) return rest; // sin id, es horario nuevo, no id
          return { id, ...rest };
        });
      }
      const changedFields: Record<string, unknown> = {};

      if (Object.keys(changedFields).length === 0 && serverApplied) {
        navigate({ to: "/voluntarios/gestion/$id", params: { id: editable } });
        toast.success("Expediente actualizado", {
          description: "Ya puedes ver este expediente y todos sus cambios.",
          duration: 4000,
        });
        return;
      }

      (Object.keys(value) as (keyof typeof value)[]).forEach((key) => {
        const newVal = value[key];
        const oldVal = expediente[key];

        if (key === "horarios") {
          const actuales = Array.isArray(newVal) ? (newVal as Horario[]) : [];
          const originales = (expediente.horarios ?? []) as Horario[];

          const idsOriginales = new Set(originales.map((h) => h.id));
          const idsActuales = new Set(actuales.map((h) => h.id));

          const removed = originales.filter((h) => !idsActuales.has(h.id));
          const added = actuales.filter((h) => !idsOriginales.has(h.id));
          const modified = actuales.filter((h) => {
            const o = originales.find((x) => x.id === h.id);
            return o && (o.dia !== h.dia || o.horaInicio !== h.horaInicio || o.horaFin !== h.horaFin);
          });

          if (removed.length || added.length || modified.length || actuales.length !== originales.length) {
            changedFields[key] = actuales.map(({ id, ...rest }) => (id ? { id, ...rest } : rest));
          }
        } else if (key === "contactosEmergencia") {
          const newContacts = JSON.stringify(newVal ?? []);
          const oldContacts = JSON.stringify(oldVal ?? []);
          if (newContacts !== oldContacts) {
            changedFields[String(key)] = newVal;
          }
        } else {
          const normalizedNew = typeof newVal === "number" ? String(newVal) : (newVal ?? "");
          const normalizedOld = typeof oldVal === "number" ? String(oldVal) : (oldVal ?? "");

          if (normalizedNew !== normalizedOld) {
            changedFields[key] = newVal;
          }
        }
      });


      if (Object.keys(changedFields).length === 0) {
        setFormErrors({ server: "No se realizaron cambios." });
        toast.warning("No se realizaron cambios", {
          description: "Edita al menos un campo antes de guardar.",
          duration: 4000,
        });
        return;
      }

      try {
        await patchExpediente.mutateAsync({
          idExpediente: Number(editable),
          expedienteEditado: changedFields,
        });
        navigate({
          to: "/voluntarios/gestion/$id",
          params: { id: editable },
        });
        toast.success("Expediente editado", {
          description: "Puedes visualizar este expediente y sus cambios.",
          duration: 4000,
        });
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setFormErrors({ credentials: "Credenciales incorrectas" });
          toast.error("Credenciales incorrectas", {
            description: "Inicia sesión de nuevo para continuar.",
            duration: 4000,
          });
        } else if (axios.isAxiosError(err) && err.response?.status === 400) {
          const backendMessage = getBackendErrorMessage(err.response?.data);
          const message = backendMessage ?? "Solicitud inválida. Verifica los datos e intenta de nuevo.";
          setFormErrors({
            server: message,
          });
          toast.error("No se pudo guardar el expediente", {
            description: message,
            duration: 4000,
          });
        } else {
          setFormErrors({
            server: "Error en el servidor, por favor intenta más tarde",
          });
          toast.error("Error en el servidor", {
            description: "Por favor intenta más tarde.",
            duration: 4000,
          });
        }
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
        className="w-full max-w-7xl pb-8"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
          <section className="rounded-xl border bg-muted/20 p-4 md:p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className=" text-muted-foreground flex items-center gap-2">
                    <Pencil size={14} />
                    Modo edición
                  </p>
                </div>

                <div className="flex min-w-0 items-center gap-4">
                  <img
                    src={getAvatarSvg(expediente.nombre ?? "", expediente.apellido1 ?? "")}
                    alt={`Avatar de ${expediente.nombre}`}
                    className="h-20 w-20 rounded-full"
                  />

                  <div className="min-w-0 flex-1">
                    <form.Field name="nombre">
                      {(field) => (
                        <div className="mb-3">
                          <Label className=" font-semibold">Nombre</Label>
                          <Input
                            id="nombre"
                            type="text"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="mt-1"
                          />
                          {formErrors.nombre && (
                            <p className="text-red-700 mt-1">{formErrors.nombre}</p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <form.Field name="apellido1">
                        {(field) => (
                          <div>
                            <Label className=" font-semibold">Apellido 1</Label>
                            <Input
                              id="apellido1"
                              type="text"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className="mt-1"
                            />
                            {formErrors.apellido1 && (
                              <p className="text-red-700 mt-1">{formErrors.apellido1}</p>
                            )}
                          </div>
                        )}
                      </form.Field>

                      <form.Field name="apellido2">
                        {(field) => (
                          <div>
                            <Label className=" font-semibold">Apellido 2</Label>
                            <Input
                              id="apellido2"
                              type="text"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className="mt-1"
                            />
                            {formErrors.apellido2 && (
                              <p className="text-red-700 mt-1">{formErrors.apellido2}</p>
                            )}
                          </div>
                        )}
                      </form.Field>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <form.Field name="cedula">
                        {(field) => (
                          <div>
                            <Label className=" font-semibold">Cédula</Label>
                            <Input
                              id="cedula"
                              type="text"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className="mt-1"
                            />
                            {formErrors.cedula && (
                              <p className="text-red-700 mt-1">{formErrors.cedula}</p>
                            )}
                          </div>
                        )}
                      </form.Field>

                      <form.Field name="sexo">
                        {(field) => (
                          <div>
                            <Label className="font-semibold">Sexo</Label>
                            <RadioGroup
                              value={field.state.value}
                              onValueChange={field.handleChange}
                              className="flex gap-3 mt-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="F" id="sexoF" className="h-3 w-3" />
                                <Label htmlFor="sexoF">Fem.</Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem value="M" id="sexoM" className="h-3 w-3" />
                                <Label htmlFor="sexoM" >Masc.</Label>
                              </div>
                            </RadioGroup>
                            {formErrors.sexo && (
                              <p className="text-red-700  mt-1">{formErrors.sexo}</p>
                            )}
                          </div>
                        )}
                      </form.Field>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="text-base font-semibold">Información personal</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-3">
                  <form.Field name="ocupacion">
                    {(field) => (
                      <div>
                        <Label className="font-semibold">Ocupación</Label>
                        <Input
                          id="ocupacion"
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="mt-1"
                        />
                        {formErrors.ocupacion && (
                          <p className="text-red-700 mt-1">{formErrors.ocupacion}</p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="telefono">
                    {(field) => (
                      <div>
                        <Label className=" font-semibold">Teléfono</Label>
                        <Input
                          id="telefono"
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="mt-1"
                        />
                        {formErrors.telefono && (
                          <p className="text-red-700 mt-1">{formErrors.telefono}</p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="email">
                    {(field) => (
                      <div>
                        <Label className=" font-semibold">Correo</Label>
                        <Input
                          id="email"
                          type="email"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="mt-1"
                        />
                        {formErrors.email && (
                          <p className="text-red-700 mt-1">{formErrors.email}</p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="direccion">
                    {(field) => (
                      <div>
                        <Label className="font-semibold">Dirección exacta</Label>
                        <Input
                          id="direccion"
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="mt-1"
                        />
                        {formErrors.direccion && (
                          <p className="text-red-700 mt-1">{formErrors.direccion}</p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="experienciaLaboral">
                    {(field) => (
                      <div>
                        <Label className="font-semibold">Experiencia</Label>
                        <Input
                          id="experienciaLaboral"
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="mt-1"
                        />
                        {formErrors.experienciaLaboral && (
                          <p className="text-red-700 mt-1">{formErrors.experienciaLaboral}</p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="contactosEmergencia">
                    {(field) => {
                      const contacto =
                        Array.isArray(field.state.value) && field.state.value.length > 0
                          ? field.state.value[0]
                          : { id: 0, nombre: "", telefono: "" };

                      const handleContactChange = (key: "nombre" | "telefono", value: string) => {
                        const updatedContact = {
                          ...contacto,
                          [key]: value,
                          id: contacto.id ?? 0,
                        };
                        field.handleChange([updatedContact]);
                      };

                      return (
                        <div className="space-y-2">
                          <Label className="font-semibold">Contacto de emergencia</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-muted-foreground">Nombre</Label>
                              <Input
                                id="contacto-nombre"
                                type="text"
                                value={contacto.nombre}
                                onChange={(e) => handleContactChange("nombre", e.target.value)}
                                placeholder="Nombre"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Teléfono</Label>
                              <Input
                                id="contacto-telefono"
                                type="tel"
                                value={contacto.telefono}
                                onChange={(e) => handleContactChange("telefono", e.target.value)}
                                placeholder="Teléfono"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          {formErrors.contactosEmergencia && (
                            <p className="text-red-700 mt-1">{formErrors.contactosEmergencia}</p>
                          )}
                        </div>
                      );
                    }}
                  </form.Field>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="text-base font-semibold">Observaciones</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form.Field name="observaciones">
                  {(field) => (
                    <div>
                      <Textarea
                        id="observaciones"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Agregar observaciones..."
                        className="min-h-24"
                      />
                      {formErrors.observaciones && (
                        <p className="text-red-700 mt-1">{formErrors.observaciones}</p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-base font-semibold">Horario</h3>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form.Field
              name="horarios"
              children={(field) => (
                <EditableHorario
                  horarios={Array.isArray(field.state.value) ? field.state.value : []}
                  onChange={field.handleChange}
                  onServerMutated={(snapshot) => {
                    field.handleChange(snapshot);
                    setServerApplied(true);
                  }}
                />
              )}
            />
          </section>
        </div>

        {formErrors.credentials && (
          <p className="text-red-700 text-center mt-4">{formErrors.credentials}</p>
        )}
        {formErrors.server && (
          <p className="text-red-700 text-center mt-4">{formErrors.server}</p>
        )}

        <div className="sticky bottom-0 z-20 mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <p className="text-sm text-muted-foreground">Revisa los cambios antes de guardar.</p>
          <div className="flex gap-2">
            <Button variant="approve" type="submit">
              Guardar cambios
            </Button>
            <Button type="button" variant="secondary" onClick={() => gotoInicio(editable)}>
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CardEditarExpediente;
