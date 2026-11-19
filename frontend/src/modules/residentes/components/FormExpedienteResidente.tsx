import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { useCreateExpedienteResidente, useGetEstadoCivil, useGetLineaPobreza, useGetTiposDependencia, useGetTiposPension } from '../hooks/expedientesHooks';
import { useAutofillEncargado, useAutofillResidente } from '../hooks/residentesHooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { crearExpedienteResidenteSchema } from '../schema/residentesSchema';
import { defaultValuesCrearExpedienteResidente } from '../models/expedienteResidente';
import { RadioGroup } from '@radix-ui/react-radio-group';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import CalendarField from '../../../components/CalendarField';
import { ArrowRight, X, Search } from 'lucide-react';

const FormExpedienteResidente = () => {
  const navigate = useNavigate();
  const formMutation = useCreateExpedienteResidente();
  const autofillResidenteMutation = useAutofillResidente();
  const autofillEncargadoMutation = useAutofillEncargado();
  const { tiposDependencia } = useGetTiposDependencia();
  const { estadoCivil } = useGetEstadoCivil();
  const { tipoPension } = useGetTiposPension();
  const { lineaPobreza } = useGetLineaPobreza();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [isAutocompletingFields, setIsAutocompletingFields] = useState(false);
  const [autocompletingEncargadoIndex, setAutocompletingEncargadoIndex] = useState<number | null>(null);

  const calculateAge = (birthDate: string | Date): number => {
    if (!birthDate) return 0;

    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const form = useForm({
    defaultValues: defaultValuesCrearExpedienteResidente,
    onSubmit: async ({ value }) => {
      setFormErrors({});

      const dataWithAge = {
        ...value,
        residente: {
          ...value.residente,
          edad: value.residente.fecha_nacimiento
            ? calculateAge(value.residente.fecha_nacimiento)
            : undefined
        }
      };

      const result = crearExpedienteResidenteSchema.safeParse(dataWithAge);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setFormErrors(fieldErrors);
        return;
      }

      try {
        const fixedData = {
          ...result.data,
          residente: {
            ...result.data.residente,
            email: result.data.residente.email ?? '',
            apellido2: result.data.residente.apellido2 === null ? undefined : result.data.residente.apellido2,
            lineaPobreza: result.data.residente.lineaPobreza,
            encargados: (result.data.residente.encargados ?? []).map((encargado) => ({
              ...encargado,
              correo: encargado.correo ?? '',
              apellido2: encargado.apellido2 ?? '',
            }))
          },
        };
        await formMutation.mutateAsync({ expediente: fixedData });
        toast.success('Expediente creado', {
          description: 'Puedes visualizar este expediente en gestión de residentes',
          duration: 4000,
        });
        navigate({ to: '/residentes' });
      } catch (err: unknown) {
        const error = err as { response?: { status?: number; data?: { message?: string } } };
        if (error.response?.status === 401) {
          setFormErrors({ credentials: "Credenciales incorrectas" });
        } else if (error.response?.status === 400) {
          toast.warning("No puedes hacer eso", {
            description:
              error.response?.data?.message || "Hay un expediente activo con esa cédula",
            duration: 4000,
          });
        } else if (error.response?.status === 403) {
          toast.warning("No puedes hacer eso", {
            description:
              error.response?.data?.message || "No tienes permisos para acceder a este recurso",
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

  const handleSearchResidente = async () => {
    const cedula = form.getFieldValue("residente.cedula") as string;
    if (!cedula || cedula.trim() === '') {
      toast.error('Ingresa la cédula primero', {
        description: 'Por favor ingresa un número de cédula válido',
      });
      return;
    }

    setIsAutocompletingFields(true);
    try {
      const result = await autofillResidenteMutation.mutateAsync(cedula);
      const residente = result as { firstname?: string; lastname1?: string; lastname2?: string } | null;

      if (residente) {
        form.setFieldValue("residente.nombre", residente.firstname || '');
        form.setFieldValue("residente.apellido1", residente.lastname1 || '');
        form.setFieldValue("residente.apellido2", residente.lastname2 || '');

        toast.success('Datos completados', {
          description: 'Los datos del residente se han completado automáticamente',
          duration: 2000,
        });

        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors['residente.cedula'];
          return newErrors;
        });
      } else {
        setFormErrors(prev => ({
          ...prev,
          'residente.cedula': 'Ya existe un residente con esa cédula'
        }));
      }
    } catch (error: unknown) {
      const searchError = error as { response?: { status?: number } };
      console.error('Error searching residente:', error);
      if (searchError.response?.status === 409) {
        setFormErrors(prev => ({
          ...prev,
          'residente.cedula': 'Ya existe un residente con esa cédula'
        }));
      } else {
        toast.error('Error en la búsqueda', {
          description: 'No se pudo encontrar los datos del residente. Verifica la cédula e intenta nuevamente.',
          duration: 4000,
        });
      }
    } finally {
      setIsAutocompletingFields(false);
    }
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 0:
        return [
          'residente.cedula',
          'residente.nombre',
          'residente.apellido1',
          'residente.apellido2',
          'residente.fecha_nacimiento',
          'residente.sexo',
          'residente.estado_civil'
        ];
      case 1:
        return [
          'residente.email',
          'fecha_ingreso',
          'residente.dependencia',
          'tipo_pension',
          'residente.lineaPobreza'
        ];
      case 2:
        return ['residente.encargados'];
      default:
        return [];
    }
  };

  const validateCurrentStepWithZod = (step: number) => {
    const fields = getFieldsForStep(step);
    const dataWithAge = {
      ...form.state.values,
      residente: {
        ...form.state.values.residente,
        edad: form.state.values.residente?.fecha_nacimiento
          ? calculateAge(form.state.values.residente.fecha_nacimiento)
          : undefined
      }
    };

    const result = crearExpedienteResidenteSchema.safeParse(dataWithAge);

    if (result.success) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        fields.forEach(field => {
          delete newErrors[field];
          if (field === 'residente.encargados') {
            Object.keys(newErrors).forEach(key => {
              if (key.startsWith('residente.encargados.')) {
                delete newErrors[key];
              }
            });
          }
        });
        return newErrors;
      });
      return true;
    } else {
      const stepErrors: Record<string, string> = {};

      result.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (fields.some(field => {
          if (field === 'residente.encargados') {
            return path.startsWith('residente.encargados');
          }
          return path === field;
        })) {
          stepErrors[path] = err.message;
        }
      });

      setFormErrors(prev => ({ ...prev, ...stepErrors }));
      return Object.keys(stepErrors).length === 0;
    }
  };

  const nextStep = async () => {
    const isZodValid = validateCurrentStepWithZod(step);
    if (!isZodValid) {
      return;
    }

    setStep(s => Math.min(s + 1, 2));
  };
  const cancelar = () => {
    navigate({
      to: "/residentes"
    });
  }
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < 2) {
      await nextStep();
    } else {
      const isValid = validateCurrentStepWithZod(step);
      if (isValid) {
        form.handleSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-fit lg:w-5xl md:w-full">
        <CardHeader>
          <CardTitle>Crea un nuevo expediente de residente</CardTitle>
          <CardDescription>
            Puedes crear un expediente nuevo para un residente que ahora sea parte del Hogar San Blas.
          </CardDescription>
        </CardHeader>

        <CardContent className="text-justify">
          <div className="flex mb-6 gap-4">
            {['Datos personales', 'Información adicional', 'Encargado'].map((label, i) => (
              <div key={i} className={cn("flex-1 text-center py-1 border-b-2", step === i ? "border-pink-500 font-semibold" : "border-gray-300")}>
                {label}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="residente.cedula">
                {(field) => (
                  <div className="mb-4">
                    <Label htmlFor="cedula" className="font-semibold">Cédula:</Label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          id="cedula"
                          type='number'
                          value={field.state.value}
                          onChange={e => {
                            field.handleChange(e.target.value);
                            if (formErrors['residente.cedula']) {
                              setFormErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors['residente.cedula'];
                                return newErrors;
                              });
                            }
                          }}
                          disabled={isAutocompletingFields}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSearchResidente}
                        disabled={isAutocompletingFields || autofillResidenteMutation.isPending}
                        aria-label="Buscar residente por cédula"
                      >
                        <Search />
                        <span className="sr-only">Buscar residente</span>
                      </Button>
                    </div>
                    {isAutocompletingFields && (
                      <p className="text-blue-600 text-xs mt-1">Buscando datos del residente...</p>
                    )}
                    {formErrors['residente.cedula'] && (
                      <p className="text-red-700 text-sm mt-1">{formErrors['residente.cedula']}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="residente.nombre">{(field) => (
                <div className="mb-4">
                  <Label htmlFor="nombre" className="font-semibold">Nombre:</Label>
                  <Input id="nombre" 
                  type='text'
                  value={field.state.value} 
                  onChange={e => field.handleChange(e.target.value)}
                  disabled={isAutocompletingFields}
                  />
                  {formErrors['residente.nombre'] && (
                    <p className="text-red-700 text-sm">{formErrors['residente.nombre']}</p>
                  )}
                </div>
              )}</form.Field>

              <form.Field name="residente.apellido1">{(field) => (
                <div className="mb-4">
                  <Label htmlFor="apellido1" className="font-semibold">Primer Apellido:</Label>
                  <Input id="apellido1"
                    type='text' 
                    value={field.state.value} 
                    onChange={e => field.handleChange(e.target.value)}
                    disabled={isAutocompletingFields}
                  />
                  {formErrors['residente.apellido1'] && <p className="text-red-700 text-sm">{formErrors['residente.apellido1']}</p>}
                </div>
              )}</form.Field>

              <form.Field name="residente.apellido2">{(field) => (
                <div className="mb-4">
                  <Label htmlFor="apellido2" className="font-semibold">Segundo Apellido:</Label>
                  <Input id="apellido2"
                    type='text' 
                    value={field.state.value} 
                    onChange={e => field.handleChange(e.target.value)}
                    disabled={isAutocompletingFields}
                  />
                  {formErrors['residente.apellido2'] && <p className="text-red-700 text-sm">{formErrors['residente.apellido2']}</p>}
                </div>
              )}</form.Field>

              <form.Field name="residente.fecha_nacimiento">
                {(field) => (
                  <div className="flex flex-col mb-4">
                    <Label className="font-semibold">Fecha de nacimiento:</Label>
                    <CalendarField
                      value={field.state.value}
                      onChange={field.handleChange}
                      disableFuture
                    />
                    {formErrors['residente.fecha_nacimiento'] && (
                      <p className="text-red-700 text-sm">{formErrors['residente.fecha_nacimiento']}</p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="residente.edad">
                {(field) => (
                  <div className="mb-4">
                    <Label htmlFor="edad" className="font-semibold">Edad:</Label>
                    <Input
                      id="edad"
                      value={form.state.values.residente?.fecha_nacimiento
                        ? calculateAge(form.state.values.residente.fecha_nacimiento)
                        : ''
                      }
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                      placeholder={"Se calcula automáticamente" + field.state.value}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      La edad se calcula automáticamente basada en la fecha de nacimiento.
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="residente.sexo">{(field) => (
                <div className="mb-4">
                  <Label className="font-semibold mb-2 block">Sexo:</Label>
                  <RadioGroup value={field.state.value} onValueChange={field.handleChange} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="F" id="sexoF" />
                      <Label className='hover:cursor-pointer' htmlFor="sexoF">Femenino</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="M" id="sexoM" />
                      <Label className='hover:cursor-pointer' htmlFor="sexoM">Masculino</Label>
                    </div>
                  </RadioGroup>
                  {formErrors['residente.sexo'] && (
                    <p className="text-red-700 text-sm">{formErrors['residente.sexo']}</p>
                  )}
                </div>
              )}</form.Field>

              <form.Field name="residente.estado_civil">{(field) => (
                <div className="mb-4">
                  <Label className="block mb-2 font-semibold">Estado civil:</Label>
                  <RadioGroup value={String(field.state.value ?? '')} onValueChange={v => field.handleChange(v)} className="flex gap-2">
                    {estadoCivil?.map(t => (
                      <div key={t.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(t.id)} id={`estado-${t.id}`} />
                        <Label className='hover:cursor-pointer' htmlFor={`estado-${t.id}`}>{t.nombre}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {formErrors['residente.estado_civil'] && (
                    <p className="text-red-700 text-sm">{formErrors['residente.estado_civil']}</p>
                  )}
                </div>
              )}</form.Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="residente.email">{(field) => (
                <div className="mb-4">
                  <Label htmlFor="email" className="font-semibold">Correo electrónico:</Label>
                  <Input id="email" type="email" value={field.state.value} onChange={e => field.handleChange(e.target.value)} />
                  {formErrors['residente.email'] && (
                    <p className="text-red-700 text-sm">{formErrors['residente.email']}</p>
                  )}
                </div>
              )}</form.Field>

              <form.Field name="tipo_pension">{(field) => (
                <div className="mb-4">
                  <Label className="block mb-2 font-semibold">Tipo de pensión:</Label>
                  <RadioGroup value={String(field.state.value ?? '')} onValueChange={v => field.handleChange(v)} className="flex gap-2 ">
                    {tipoPension?.map(t => (
                      <div key={t.id} className="flex items-center space-x-2 ">
                        <RadioGroupItem value={String(t.id)} id={`pension-${t.id}`} />
                        <Label className='hover:cursor-pointer' htmlFor={`pension-${t.id}`}>{t.nombre}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {formErrors['tipo_pension'] && (
                    <p className="text-red-700 text-sm">{formErrors['tipo_pension']}</p>
                  )}
                </div>
              )}</form.Field>

              <form.Field name="residente.dependencia">{(field) => (
                <div className="mb-4">
                  <Label className="block mb-2 font-semibold">Tipo de Dependencia:</Label>
                  <RadioGroup value={String(field.state.value ?? '')} onValueChange={v => field.handleChange(v)} className="flex gap-2">
                    {tiposDependencia?.map(t => (
                      <div key={t.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(t.id)} id={`tipo-${t.id}`} />
                        <Label className='hover:cursor-pointer' htmlFor={`tipo-${t.id}`}>{t.nombre}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {formErrors['residente.dependencia'] && (
                    <p className="text-red-700 text-sm">{formErrors['residente.dependencia']}</p>
                  )}
                </div>
              )}</form.Field>

              <form.Field name="fecha_ingreso">
                {(field) => (
                  <div className="flex flex-col mb-4">
                    <Label className="font-semibold">Fecha de ingreso:</Label>
                    <CalendarField
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                    {formErrors['fecha_ingreso'] && (
                      <p className="text-red-700 text-sm">{formErrors['fecha_ingreso']}</p>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Field name="residente.lineaPobreza">
                {(field) => (
                  <div className="mb-4">
                    <Label className="block mb-2 font-semibold">Línea de Pobreza:</Label>
                    <RadioGroup
                      value={String(field.state.value ?? '')}
                      onValueChange={(v) => field.handleChange(v)}
                      className="flex flex-wrap gap-4"
                    >
                      {lineaPobreza?.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center whitespace-nowrap"
                        >
                          <RadioGroupItem value={String(t.id)} id={`tipo-${t.id}`} />
                          <Label className="hover:cursor-pointer ml-1" htmlFor={`tipo-${t.id}`}>
                            {t.nombre}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {formErrors['residente.lineaPobreza'] && (
                      <p className="text-red-700 text-sm">{formErrors['residente.lineaPobreza']}</p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>
          )}

          {step === 2 && (
            <form.Field name="residente.encargados">{(field) => {
              const valueArray = Array.isArray(field.state.value) ? field.state.value : [];

              const handleChange = (idx: number, key: string, val: string) => {
                const updated = [...valueArray];
                updated[idx] = { ...updated[idx], [key]: val };
                field.handleChange(updated);

                const errorKey = `residente.encargados.${idx}.${key}`;
                if (formErrors[errorKey]) {
                  const newErrors = { ...formErrors };
                  delete newErrors[errorKey];
                  setFormErrors(newErrors);
                }
              };

              const addEncargado = () => {
                field.handleChange([
                  ...valueArray,
                  { cedula: '', nombre: '', apellido1: '', apellido2: '', telefono: '', correo: '' }
                ]);
              };

              const removeEncargado = (idx: number) => {
                if (valueArray.length <= 1) return;

                const updated = valueArray.filter((_, i) => i !== idx);
                field.handleChange(updated);

                const newErrors = { ...formErrors };
                Object.keys(newErrors).forEach(key => {
                  if (key.startsWith(`residente.encargados.${idx}.`)) {
                    delete newErrors[key];
                  }
                });
                setFormErrors(newErrors);
              };

              const labels: Record<string, string> = {
                cedula: 'Cédula',
                nombre: 'Nombre',
                apellido1: 'Primer Apellido',
                apellido2: 'Segundo Apellido',
                telefono: 'Teléfono',
                correo: 'Correo Electrónico',
              };

              if (valueArray.length === 0) {
                field.handleChange([{ cedula: '', nombre: '', apellido1: '', apellido2: '', telefono: '', correo: '' }]);
              }

              return (
                <div className="mb-4">
                  <Label className="font-semibold block mb-2">Encargados:</Label>
                  {formErrors['residente.encargados'] && (
                    <p className="text-red-700 text-sm mb-2">{formErrors['residente.encargados']}</p>
                  )}

                  {valueArray.map((contacto, idx) => (
                    <div key={idx} className="border p-4 mb-4 relative rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-700">Encargado {idx + 1}</h4>
                        {valueArray.length > 1 && (
                          <button
                            type="button"
                            className="text-red-500 hover:cursor-pointer hover:text-red-700 font-bold text-xl"
                            onClick={() => removeEncargado(idx)}
                            title="Eliminar encargado"
                          >
                            <X />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {Object.keys(contacto).map((k) => {
                          if (k === 'cedula') {
                            return (
                              <div key={k} className="mb-2">
                                <Label className="block font-semibold mb-1">{labels[k]}</Label>
                                <div className="flex gap-2 items-end">
                                  <div className="flex-1">
                                    <Input
                                      value={contacto[k as keyof typeof contacto]}
                                      onChange={(e) => handleChange(idx, k, e.target.value)}
                                      placeholder={`Ingrese ${labels[k].toLowerCase()}`}
                                      disabled={autocompletingEncargadoIndex === idx}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={async () => {
                                      const ced = contacto.cedula;
                                      if (!ced || String(ced).trim() === '') {
                                        toast.error('Ingrese la cédula del encargado primero');
                                        return;
                                      }
                                      setAutocompletingEncargadoIndex(idx);
                                      try {
                                        const res = await autofillEncargadoMutation.mutateAsync(String(ced));
                                        const updated = [...valueArray];
                                        updated[idx] = {
                                          ...updated[idx],
                                          nombre: res.firstname || '',
                                          apellido1: res.lastname1 || '',
                                          apellido2: res.lastname2 || '',
                                        };
                                        field.handleChange(updated);
                                        toast.success('Encargado autocompletado');
                                      } catch (err) {
                                        console.error('Error autocompletando encargado:', err);
                                        toast.error('No se pudo autocompletar encargado');
                                      } finally {
                                        setAutocompletingEncargadoIndex(null);
                                      }
                                    }}
                                    disabled={autocompletingEncargadoIndex === idx || autofillEncargadoMutation.isPending}
                                    className="mb-0"
                                    aria-label={`Autocompletar encargado ${idx + 1} por cédula`}
                                  >
                                    <Search className="w-4 h-4" />
                                  </Button>
                                </div>
                                {formErrors[`residente.encargados.${idx}.${k}`] && (
                                  <p className="text-red-700 text-sm mt-1">{formErrors[`residente.encargados.${idx}.${k}`]}</p>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={k} className="mb-2">
                              <Label className="block font-semibold mb-1">{labels[k]}</Label>
                              <Input
                                value={contacto[k as keyof typeof contacto]}
                                onChange={(e) => handleChange(idx, k, e.target.value)}
                                placeholder={`Ingrese ${labels[k].toLowerCase()}`}
                                disabled={autocompletingEncargadoIndex === idx && (k === 'nombre' || k === 'apellido1' || k === 'apellido2')}
                              />
                              {k !== 'apellido2' && formErrors[`residente.encargados.${idx}.${k}`] && (
                                <p className="text-red-700 text-sm mt-1">{formErrors[`residente.encargados.${idx}.${k}`]}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addEncargado} className="mt-2">
                    + Agregar otro encargado
                  </Button>
                </div>
              );
            }}</form.Field>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-4">
          {step === 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={cancelar}
              disabled={isAutocompletingFields}
            >
              Cancelar
            </Button>
          )}
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={isAutocompletingFields}
            >
              Anterior
            </Button>
          )}
          <Button
            type="submit"
            variant={"create"}
            className={step < 2 ? "" : "flex-1"}
            disabled={isAutocompletingFields || formMutation.isPending}
          >
            {isAutocompletingFields
              ? 'Buscando...'
              : formMutation.isPending
                ? 'Creando expediente...'
                : step < 2
                  ? 'Siguiente'
                  : 'Crear expediente'
            } <ArrowRight />
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default FormExpedienteResidente;