# Despliegue con Coolify

Este es el camino principal de publicación para esta instalación: el propietario administra la VPS mediante Coolify, sin necesitar SSH. El procedimiento SSH queda como alternativa de administración, no como requisito del estudiante.

1. Habilitar acceso API si está disponible y crear un token con el alcance mínimo necesario para este recurso. Guardarlo localmente en `.env.coolify.local` o en el gestor de secretos de CI, nunca en el chat ni en Git. La URL del panel sí se puede compartir. Si la cuenta no permite crear tokens, el administrador debe habilitar el acceso o ejecutar las acciones de panel preparadas.
2. Crear un proyecto/environment exclusivo, por ejemplo SIDNAM DevSecOps / staging. No reutilizar los recursos productivos.
3. Publicar las imágenes revisadas de frontend y backend en un registro accesible para Coolify. Para imágenes privadas configurar una credencial de solo lectura del registro en Coolify. Registrar los digests exactos de la pareja.
4. Crear un recurso Docker Compose usando `deploy/staging/compose.coolify.yaml`, desde Git o mediante Docker Compose Empty. No activar despliegues automáticos de ramas no confiables.
5. Configurar las variables obligatorias con secretos nuevos y `BACKEND_IMAGE`/`FRONTEND_IMAGE` con referencias inmutables. `APP_ORIGIN` debe coincidir exactamente con el origen HTTPS del frontend. Se puede usar el dominio de prueba generado por Coolify si permite HTTPS válido.
6. Asignar dominio exclusivamente al servicio `web`, puerto interno 8080. No publicar MySQL, backend ni el servicio de migración. Revisar la definición Compose que Coolify genera: debe conservar la red interna y las condiciones de salud/migración.
7. Desplegar. El servicio migrate aplica el esquema versionado y siembra usuarios ficticios antes de iniciar el backend. Después verificar públicamente salud, cookies, login y CRUD, y ejecutar las pruebas E2E y DAST con sus reportes.
8. Registrar UUID del recurso, URL pública, deployment ID, digests y commits. Configurar respaldo del volumen de staging en Coolify y comprobar una restauración independiente. Para rollback mantener la pareja de digests anterior; una migración incompatible requiere restaurar el respaldo correspondiente.

Para habilitar automatización necesito URL del panel y acceso API delegado mediante un secreto local, además del recurso/servidor de destino que la cuenta permita administrar. Ningún token debe quedar dentro de una evidencia.

Documentación oficial: [Docker Compose](https://coolify.io/docs/applications/builds/docker-compose), [tokens API](https://coolify.io/docs/core/security/credentials/api-tokens), [primer despliegue](https://coolify.io/docs/deploy-your-first-app).
