import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useEditarExpedienteResidente,
  useGetEstadoCivil,
  useGetLineaPobreza,
  useGetTiposDependencia,
  useGetTiposPension,
} from "../hooks/expedientesHooks";
import type { EditarExpedienteResidenteProps } from "../types/expedienteResidenteProps";
import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { editarExpedienteResidenteSchema } from "../schema/residentesSchema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAvatarResidenteSvg } from "@/components/app/avatarGenerator";
import { Label } from "@radix-ui/react-label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CalendarField from "../../../components/CalendarField";
import EditableEncargado from "./EditableEncargado";
import { Pencil } from "lucide-react";
import type { EstadoTipo } from "@/models/sharedModels";

const FormEditarExpedienteResidente = ({
  expediente,
}: EditarExpedienteResidenteProps) => {
  const { id } = useParams({ from: "/residentes/$id/editar" });
  const editarExpediente = useEditarExpedienteResidente();
  const { tiposDependencia } = useGetTiposDependencia();
  const { estadoCivil } = useGetEstadoCivil();
  const { lineaPobreza } = useGetLineaPobreza();
  const { tipoPension } = useGetTiposPension();
  const navigate = useNavigate();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const normalizeSexoValue = (value: unknown) => {
    if (value === "F" || value === "M") return value;
    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      if (lowerValue.startsWith("f")) return "F";
      if (lowerValue.startsWith("m")) return "M";
    }
    if (
      value &&
      typeof value === "object" &&
      "nombre" in value &&
      typeof value.nombre === "string"
    ) {
      const lowerValue = value.nombre.toLowerCase();
      if (lowerValue.startsWith("f")) return "F";
      if (lowerValue.startsWith("m")) return "M";
    }
    return "";
  };

  const normalizeOptionId = (value: unknown, options?: EstadoTipo[]) => {
    const normalizeText = (text: string) =>
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    if (typeof value === "number") return value;

    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;

      if (options) {
        const match = options.find(
          (option) => normalizeText(option.nombre) === normalizeText(value)
        );
        if (match) return match.id;
      }

      return null;
    }

    if (value && typeof value === "object") {
      const objectValue = value as Record<string, unknown>;
      const rawId =
        objectValue.id ?? objectValue.id_estado_civil ?? objectValue.estado_civil;

      if (typeof rawId === "number") return rawId;

      if (typeof rawId === "string") {
        const parsed = Number(rawId);
        return Number.isNaN(parsed) ? null : parsed;
      }

      const rawNombre = objectValue.nombre;
      if (typeof rawNombre === "string" && options) {
        const match = options.find(
          (option) => normalizeText(option.nombre) === normalizeText(rawNombre)
        );
        if (match) return match.id;
      }
    }

    return null;
  };

  const calculateAge = (birthDate: string | Date): number => {
    if (!birthDate) return 0;

    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  };

  const form = useForm({
    defaultValues: {
      ...expediente,
      sexo: normalizeSexoValue(expediente.sexo),
      estado_civil: normalizeOptionId(expediente.estado_civil),
      dependencia: normalizeOptionId(expediente.dependencia),
      tipo_pension: normalizeOptionId(expediente.tipo_pension),
      lineaPobreza: normalizeOptionId(expediente.lineaPobreza),
      fecha_ingreso: expediente.fecha_ingreso ?? "",
      encargados: expediente.encargados ?? [],
    },

    onSubmit: async ({ value }) => {
      setFormErrors({});

      const dataToValidate = { ...value };

      const result =
        editarExpedienteResidenteSchema.partial().safeParse(dataToValidate);

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      const changedFields: Record<string, unknown> = {};

      const fieldsToCheck = [
        "nombre",
        "apellido1",
        "apellido2",
        "cedula",
        "correo",
        "fecha_nacimiento",
        "tipo_pension",
        "lineaPobreza",
        "fecha_ingreso",
        "sexo",
        "estado_civil",
        "dependencia",
      ];

      fieldsToCheck.forEach((field) => {
        const newValue = value[field as keyof typeof value];
        const originalValue = expediente[field as keyof typeof expediente];

        const normalizeValue = (val: unknown) => {
          if (val === null || val === undefined) return null;
          if (typeof val === "number") return val;
          if (typeof val === "string") {
            if (val.trim() === "") return null;
            const parsed = Number(val);
            if (!isNaN(parsed)) return parsed;
            return val;
          }
          return val;
        };

        const normalizedNew = normalizeValue(newValue);
        const normalizedOriginal = normalizeValue(originalValue);

        if (normalizedNew !== normalizedOriginal) {
          changedFields[field] = value[field as keyof typeof value];

          if (field === "fecha_nacimiento" && value.fecha_nacimiento) {
            changedFields.edad = calculateAge(value.fecha_nacimiento);
          }
        }
      });

      if (value.encargados) {
        const actuales = (value.encargados ?? []).map((e: any) => ({
          ...e,
          cedula: String(e.cedula ?? ""),
        }));

        const originales = (expediente.encargados ?? []).map((e: any) => ({
          ...e,
          cedula: String(e.cedula ?? ""),
        }));

        const modificados = actuales.filter((e: any) => {
          if (!e.id) return true;
          const original = originales.find((o: any) => o.id === e.id);
          if (!original) return true;
          return (
            e.cedula !== original.cedula ||
            e.nombre !== original.nombre ||
            e.apellido1 !== original.apellido1 ||
            e.apellido2 !== original.apellido2 ||
            e.correo !== original.correo ||
            e.telefono !== original.telefono
          );
        });

        const paraEnviar = modificados.map((e: any) => {
          if (!e.id) {
            const { ...sinId } = e;
            return sinId;
          }
          return e;
        });

        if (paraEnviar.length > 0) {
          changedFields.encargados = paraEnviar;
        }
      }

      if (Object.keys(changedFields).length === 0) {
        setFormErrors({ server: "No se realizaron cambios." });
        return;
      }

      try {
        await editarExpediente.mutateAsync({
          idExpediente: Number(id),
          expedienteEditado: changedFields,
        });

        navigate({
          to: "/residentes/$id",
          params: { id: Number(id) },
        });

        toast.success("Expediente editado", {
          description: "Puedes visualizar este expediente y sus cambios.",
          duration: 4000,
        });
      } catch (err: any) {
        if (err.response?.status === 401) {
          setFormErrors({ credentials: "Credenciales incorrectas" });
        } else if (err.response?.status === 400) {
          toast.warning("No puedes hacer eso", {
            description:
              err.response?.data?.message ||
              "Hay un expediente activo con esa cédula",
            duration: 4000,
          });
        } else {
          setFormErrors({
            server: `Error en el servidor: ${err.response?.data?.message || err.message || "Error desconocido"
              }`,
          });
        }
      }
    },
  });

  useEffect(() => {
    const currentValue = form.state.values.estado_civil;
    if (currentValue != null) return;

    const resolvedEstadoCivil = normalizeOptionId(
      expediente.estado_civil,
      estadoCivil
    );

    if (resolvedEstadoCivil != null) {
      form.setFieldValue("estado_civil", resolvedEstadoCivil);
    }
  }, [estadoCivil, expediente.estado_civil, form]);

  const sectionClass = "px-1 py-4 sm:px-2";
  const sectionTitleClass = "text-base font-semibold text-foreground text-center";
  const fieldStackClass = "space-y-2";
  const fieldCardClass = "rounded-lg border border-border/50 bg-muted/10 p-4";
  const errorClass = "text-sm text-red-700";
  const radioWrapClass = "flex flex-wrap gap-4";
  const radioItemClass = "flex items-center gap-2";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="mx-auto flex w-full max-w-7xl flex-col gap-2 divide-y divide-border/60 px-2 pb-8 sm:px-4 lg:px-6"
    >
      <section className={sectionClass}>
        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="p-2">
            <div className="flex flex-col items-center text-center">
              <p className=" text-muted-foreground flex items-center gap-2">
                <Pencil size={14} />
                Modo edición
              </p>
              <img
                src={getAvatarResidenteSvg(
                  expediente.nombre ?? "",
                  expediente.apellido1 ?? "",
                  normalizeSexoValue(expediente.sexo)
                )}
                alt={`Avatar de ${expediente.nombre}`}
                className="h-28 w-28 rounded-full"
              />
            </div>
          </aside>

          <div className="space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h3 className={sectionTitleClass}>Datos de identificación</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <form.Field
                name="cedula"
                validators={{ onChangeAsyncDebounceMs: 500 }}
                children={(field) => (
                  <div className={fieldStackClass}>
                    <Label htmlFor="cedula" className=" font-medium">
                      Cédula
                    </Label>
                    <Input
                      id="cedula"
                      type="text"
                      placeholder={expediente.cedula ?? "Ingrese cédula"}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {formErrors.cedula && (
                      <p className={errorClass}>{formErrors.cedula}</p>
                    )}
                  </div>
                )}
              />

              <form.Field
                name="nombre"
                validators={{ onChangeAsyncDebounceMs: 500 }}
                children={(field) => (
                  <div className={fieldStackClass}>
                    <Label htmlFor="nombre" className=" font-medium">
                      Nombre
                    </Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder={expediente.nombre ?? "Ingrese nombre"}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {formErrors.nombre && (
                      <p className={errorClass}>{formErrors.nombre}</p>
                    )}
                  </div>
                )}
              />

              <form.Field
                name="apellido1"
                validators={{ onChangeAsyncDebounceMs: 500 }}
                children={(field) => (
                  <div className={fieldStackClass}>
                    <Label htmlFor="apellido1" className=" font-medium">
                      Apellido 1
                    </Label>
                    <Input
                      id="apellido1"
                      type="text"
                      placeholder={expediente.apellido1 ?? "Ingrese apellido"}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {formErrors.apellido1 && (
                      <p className={errorClass}>{formErrors.apellido1}</p>
                    )}
                  </div>
                )}
              />

              <form.Field
                name="apellido2"
                validators={{ onChangeAsyncDebounceMs: 500 }}
                children={(field) => (
                  <div className={fieldStackClass}>
                    <Label htmlFor="apellido2" className=" font-medium">
                      Apellido 2
                    </Label>
                    <Input
                      id="apellido2"
                      type="text"
                      placeholder={expediente.apellido2 ?? "Ingrese segundo apellido"}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {formErrors.apellido2 && (
                      <p className={errorClass}>{formErrors.apellido2}</p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-6">
          <h3 className={sectionTitleClass}>Información personal</h3>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form.Field name="sexo">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass}`}>
                <Label className="font-medium">Sexo</Label>
                <RadioGroup
                  value={normalizeSexoValue(field.state.value)}
                  onValueChange={(val) => field.handleChange(val)}
                  className={radioWrapClass}
                >
                  <div className={radioItemClass}>
                    <RadioGroupItem value="F" id="sexoF" />
                    <Label htmlFor="sexoF" className="cursor-pointer">
                      Femenino
                    </Label>
                  </div>
                  <div className={radioItemClass}>
                    <RadioGroupItem value="M" id="sexoM" />
                    <Label htmlFor="sexoM" className="cursor-pointer">
                      Masculino
                    </Label>
                  </div>
                </RadioGroup>
                {formErrors.sexo && <p className={errorClass}>{formErrors.sexo}</p>}
              </div>
            )}
          </form.Field>

          <form.Field name="fecha_nacimiento">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass} flex flex-col items-center`}>
                <Label htmlFor="fecha_nacimiento" className=" font-medium">
                  Fecha de nacimiento
                </Label>
                <CalendarField
                  disableFuture
                  value={field.state.value}
                  onChange={field.handleChange}
                />
                {formErrors.fecha_nacimiento && (
                  <p className={errorClass}>{formErrors.fecha_nacimiento}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="edad">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass}`}>
                <Label htmlFor="edad" className=" font-medium">
                  Edad
                </Label>
                <Input
                  id="edad"
                  value={
                    form.state.values.fecha_nacimiento
                      ? calculateAge(form.state.values.fecha_nacimiento)
                      : field.state.value || ""
                  }
                  disabled
                  className="bg-muted"
                  placeholder="Se calcula automáticamente"
                />
                <p className="text-xs text-muted-foreground">
                  Se calcula automáticamente.
                </p>
              </div>
            )}
          </form.Field>

          <form.Field name="correo">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass}`}>
                <Label htmlFor="email" className=" font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={expediente.correo ?? "Ingrese correo electrónico"}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {formErrors["residente.email"] && (
                  <p className={errorClass}>{formErrors["residente.email"]}</p>
                )}
              </div>
            )}
          </form.Field>

          <div className="lg:col-span-2">
            <form.Field name="estado_civil">
              {(field) => {
                const normalizedEstadoCivilValue =
                  normalizeOptionId(field.state.value, estadoCivil) ??
                  normalizeOptionId(expediente.estado_civil, estadoCivil);

                return (
                  <div className={`${fieldStackClass} ${fieldCardClass}`}>
                    <Label className="font-medium">Estado civil</Label>
                    <RadioGroup
                      value={
                        normalizedEstadoCivilValue != null
                          ? String(normalizedEstadoCivilValue)
                          : ""
                      }
                      onValueChange={(val) => field.handleChange(Number(val))}
                      className={radioWrapClass}
                    >
                      {estadoCivil?.map((t) => (
                        <div key={t.id} className={radioItemClass}>
                          <RadioGroupItem
                            value={String(t.id)}
                            id={`estado-${t.id}`}
                          />
                          <Label
                            htmlFor={`estado-${t.id}`}
                            className="cursor-pointer"
                          >
                            {t.nombre}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {formErrors.estado_civil && (
                      <p className={errorClass}>{formErrors.estado_civil}</p>
                    )}
                  </div>
                );
              }}
            </form.Field>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-6">
          <h3 className={sectionTitleClass}>Pensión y estado</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <form.Field name="tipo_pension">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass}`}>
                <Label className="font-medium">Tipo de pensión</Label>
                <RadioGroup
                  value={String(field.state.value ?? "")}
                  onValueChange={(v) => field.handleChange(Number(v))}
                  className={radioWrapClass}
                >
                  {tipoPension?.map((t) => (
                    <div key={t.id} className={radioItemClass}>
                      <RadioGroupItem
                        value={String(t.id)}
                        id={`pension-${t.id}`}
                      />
                      <Label
                        className="cursor-pointer"
                        htmlFor={`pension-${t.id}`}
                      >
                        {t.nombre}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {formErrors.tipo_pension && (
                  <p className={errorClass}>{formErrors.tipo_pension}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="dependencia">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass}`}>
                <Label className="font-medium">
                  Tipo de dependencia
                </Label>
                <RadioGroup
                  value={field.state.value != null ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                  className={radioWrapClass}
                >
                  {tiposDependencia?.map((t) => (
                    <div key={t.id} className={radioItemClass}>
                      <RadioGroupItem value={String(t.id)} id={`tipo-${t.id}`} />
                      <Label htmlFor={`tipo-${t.id}`} className="cursor-pointer">
                        {t.nombre}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {formErrors.dependencia && (
                  <p className={errorClass}>{formErrors.dependencia}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="lineaPobreza">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass}`}>
                <Label className="font-medium">Línea de pobreza</Label>
                <RadioGroup
                  value={field.state.value != null ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                  className={radioWrapClass}
                >
                  {lineaPobreza?.map((t) => (
                    <div key={t.id} className={radioItemClass}>
                      <RadioGroupItem
                        value={String(t.id)}
                        id={`linea-${t.id}`}
                      />
                      <Label htmlFor={`linea-${t.id}`} className="cursor-pointer">
                        {t.nombre}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {formErrors.lineaPobreza && (
                  <p className={errorClass}>{formErrors.lineaPobreza}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="fecha_ingreso">
            {(field) => (
              <div className={`${fieldStackClass} ${fieldCardClass} flex flex-col items-center`}>
                <Label className=" font-medium">Fecha de ingreso</Label>
                <CalendarField
                  value={field.state.value}
                  onChange={field.handleChange}
                />
                {formErrors.fecha_ingreso && (
                  <p className={errorClass}>{formErrors.fecha_ingreso}</p>
                )}
              </div>
            )}
          </form.Field>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4">
          <h3 className={sectionTitleClass}>Encargados</h3>
          <p className="mt-1 text-muted-foreground">
            Actualiza o agrega encargados vinculados al expediente.
          </p>
        </div>

        <form.Field
          name="encargados"
          validators={{ onChangeAsyncDebounceMs: 500 }}
          children={(field) => (
            <EditableEncargado
              encargados={Array.isArray(field.state.value) ? field.state.value : []}
              onChange={field.handleChange}
            />
          )}
        />
        {formErrors.encargados && (
          <p className="mt-2 text-sm text-red-700">{formErrors.encargados}</p>
        )}
      </section>

      {formErrors.server && (
        <p className="text-sm text-red-700">{formErrors.server}</p>
      )}

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p className="text-sm text-muted-foreground">
          Revisa los cambios antes de guardar.
        </p>
        <div className="flex gap-2">
          <Button variant="create" type="submit">
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: "/residentes/$id", params: { id: Number(id) } })
            }
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
};

export default FormEditarExpedienteResidente;