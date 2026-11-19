# SIDNAM DevSecOps

Consultar `STATUS.md` para los resultados comprobados y sus evidencias. Este documento explica cómo reproducir y operar la entrega.

## Alcance y autoría

Proyecto académico individual sobre los repositorios existentes `KarinaMD16/sidnam-administrativa` y `KarinaMD16/sidnam-backend`. El profesor permite reutilizar el sistema. La contribución individual corresponde a los cambios DevSecOps de la rama `devsecops/curso-seguridad`; el código original mantiene su autoría. Declarar la asistencia utilizada conforme a las reglas del curso.

Se despliega una instancia separada en la VPS existente. La web informativa y los datos productivos no forman parte de las pruebas. El flujo funcional evaluado es autenticación y administración de catálogos. Las operaciones con efectos externos quedan deshabilitadas en staging; los reportes PDF que requieren Chromium no forman parte de la demostración.

## Arquitectura y seguridad

Internet HTTPS → Traefik administrado por Coolify → Nginx del frontend (8080 interno) → backend NestJS → MySQL propio. Backend y MySQL pertenecen a una red Docker interna sin salida a Internet. Solo el frontend participa además de la red de borde `coolify`, seleccionada explícitamente para Traefik. No se publican puertos de los servicios en la VPS.

Las cookies usan un prefijo propio y no tienen Domain. JWT y claves de base de datos son distintas a producción. Nombres de cuentas ficticias: `900000001` (administrador de catálogos), `900000002` (lectura), `900000003` (inactivo). Las contraseñas se generan al azar y nunca se documentan. No importar respaldos productivos.

## Reproducción local

Requisitos: Node 22, npm 10, Docker Linux operativo y acceso al registro npm y a los repositorios de imágenes. Mantener ambos checkouts; `BACKEND_DIR` permite indicar otra ubicación.

```powershell
npm ci
npm run staging:init
npx playwright install chromium firefox webkit
npm run staging:verify
```

El override local publica MySQL solo en `127.0.0.1:3307`. Si no existe la migración inicial, el ejecutor la genera contra una base VACÍA: revisarla y versionarla antes de desplegar. Si existe una base parcial tras un fallo DDL, restaurar respaldo o usar otra base vacía; no volver a generar una migración aplicada. Una base ya usada no es candidata para generar el esquema inicial.

Localmente se permite HTTP y cookies sin Secure. La entrega desplegada requiere HTTPS y `NODE_ENV=production`. Para restaurar un ambiente local no borrar volúmenes automáticamente: contienen evidencia y estado de pruebas.

## Controles y evidencias

En cada repositorio: `npm run security:scan` ejecuta Semgrep, npm audit, SBOM y Gitleaks. Descargar previamente las imágenes de `scripts/security/images.json`. Se registra el digest ejecutado; los controles que no logren ejecutarse fallan, no se cuentan como aprobados. El SCA completo incluye dependencias de desarrollo; su vista productiva es adicional.

Playwright se ejecuta en el frontend con `npm run test:e2e` y requiere `E2E_BASE_URL` y las contraseñas ficticias en el entorno. Su reporter propio produce JSON y HTML sanitizados. No conservar storageState, trazas, videos o capturas de sesiones reales.

`npm run security:dast` requiere `E2E_BASE_URL`, `E2E_ADMIN_PASSWORD` y `OPENAPI_FILE`. Verifica `environment=staging`, autentica y comprueba una ruta protegida a través de ZAP. Realiza exploración, análisis pasivo y análisis activo limitado a cinco minutos y un hilo. La importación OpenAPI se restringe a catálogos y `/me`. Esta cobertura es explícitamente parcial y no demuestra ausencia de vulnerabilidades en toda la aplicación.

Todos los reportes viven en `artifacts/`, excluido de Git. Cada ejecución tiene manifiesto con SHA-256, hora UTC/Costa Rica, commits y resultados. Conservar los reportes iniciales y finales, incluso los intentos fallidos. CI conserva los artefactos 90 días. Descargar una copia privada final antes de su vencimiento.

La política bloquea secretos vigentes, fallos de ejecución, fallos E2E, hallazgos Semgrep ERROR y vulnerabilidades SCA altas/críticas. DAST bloquea alertas altas; las medias y bajas requieren clasificación documentada. No silenciar hallazgos para obtener un pipeline verde. Un falso positivo necesita evidencia verificable. No publicar reportes sin revisar su sanitización.

## GitHub Actions

`Security` corre en ambos repositorios para push y PR con permisos de lectura. `Full DevSecOps integration` corre por push a la rama académica y también mediante workflow_dispatch. Usa el paquete de fuentes del backend y comprueba su SHA-256; `backend-source.json` registra el commit original. No necesita un token adicional para el repositorio privado. Cambios exclusivamente en `docs/` no repiten la integración, pero sí pasan por el análisis de seguridad. Consultar `DELIVERY.md` para la decisión de empaquetado. No introducir secretos de despliegue en workflows de PR no confiables.

La integración construye y levanta una instancia efímera real en el runner, ejecuta los tres navegadores y ZAP y guarda reportes aunque falle. Esto complementa, pero no sustituye, la evaluación de la URL HTTPS publicada en la VPS.

## Publicación en VPS

La instalación efectiva se administra mediante **Coolify** y su GitHub App: seguir [DELIVERY.md](DELIVERY.md). [COOLIFY.md](COOLIFY.md) y los pasos SSH siguientes documentan alternativas de instalación. No hace falta que el estudiante conozca el usuario SSH si dispone del acceso delegado a Coolify.

1. Verificar acceso SSH, dominio de staging y capacidad libre. Obtener certificado HTTPS con el mecanismo que ya administre la VPS. Agregar un server block independiente usando `deploy/staging/vps-nginx.conf.example`; validar `nginx -t` antes de recargar.
2. Ejecutar todos los controles y revisar cambios. Versionar la migración, reglas e imágenes y registrar commits exactos. `npm run staging:package` exige worktrees limpios y produce fuentes, imágenes, metadatos y hashes.
3. Transferir el paquete por SSH verificado. En `/opt/sidnam-devsecops/releases/<frontend12>-<backend12>/` extraer `frontend.tar` y `backend.tar` dentro de sus carpetas respectivas; cargar `images.tar` con Docker.
4. En un directorio privado crear `/opt/sidnam-devsecops/shared/.env.staging` usando `APP_ORIGIN=https://<dominio>` y el generador `staging:init`; protegerlo con modo 600. No reutilizar el archivo local ni credenciales productivas.
5. Ejecutar `bash release.sh <frontend12>-<backend12>`. El script respalda la base existente, aplica migración, siembra cuentas y espera salud antes de actualizar el enlace current.
6. Comprobar HTTPS públicamente y ejecutar Playwright y ZAP contra esa URL con los secretos del staging correspondiente, sin subirlos a reportes. Exportar OpenAPI desde el contenedor con autenticación, como hace `staging:verify`.

El despliegue se acepta únicamente después de verificar la URL pública y revisar la cobertura/hallazgos. Un build o health check satisfactorio no basta.

## Rollback y restauración

Registrar el release anterior y conservar sus imágenes. Para un cambio sin esquema, volver a ejecutar el script con la pareja anterior compatible. Antes de restaurar datos, detener backend y respaldar el estado actual; importar el respaldo de staging con el cliente MySQL dentro de su contenedor. Las migraciones MySQL DDL no son transaccionales. Practicar la restauración en una base independiente y comparar cuentas/registros; registrar el resultado antes de afirmar que el rollback fue probado. No ejecutar `down -v` en la VPS.

## Demostración académica

Mostrar commits propios → pipeline de los dos repositorios → reportes iniciales → correcciones y regresiones → sitio HTTPS con login y catálogo → denegación al usuario de lectura → reporte Playwright → cobertura DAST autenticada → manifiesto final. Explicar límites de las herramientas y riesgos pendientes; no presentar ejemplos simulados como ejecuciones reales.
