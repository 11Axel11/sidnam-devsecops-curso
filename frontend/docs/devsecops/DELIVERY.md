# Entrega y decisiones verificables

El despliegue principal usa la GitHub App ya conectada a Coolify. Ambos repositorios siguen independientes; `backend-source.tar.gz` es un artefacto privado generado con `git archive` desde un commit limpio del backend. `backend-source.json` conserva el commit original y SHA-256; el Dockerfile comprueba el hash antes de compilar. Nunca contiene `.git`, entornos locales, datos de usuarios ni respaldos.

Esto evita entregar tokens adicionales a CI o publicar imágenes privadas. Cada actualización de backend requiere un nuevo commit, regenerar el paquete con `staging:bundle` y revisar el cambio de hash en el frontend. La integración verifica el paquete, compila ambos componentes y prueba su conexión real. El historial completo se analiza en el pipeline propio del backend; la integración anota expresamente que su copia solo representa el código actual empaquetado.

Coolify utiliza `compose.coolify-build.yaml`, una aplicación exclusiva del proyecto SIDNAM DevSecOps / staging y una URL de prueba HTTPS. Los secretos de la VPS están en `.env.vps.staging`, ignorado por Git, y son diferentes de `.env.staging` local. La API del panel se accede por HTTPS con el token local `.env.coolify.local`.

La publicación se inicia manualmente con el cliente de Coolify después de revisar los pipelines. Los despliegues automáticos de ramas están deshabilitados; no se guarda el token amplio de Coolify como secreto de repositorio. Activar protección de ramas o revisores obligatorios de ambientes requiere al propietario de los repositorios; la cuenta de implementación tiene permiso de push pero no administración.

Para seleccionar una revisión: `node docs/devsecops/deploy-reviewed.mjs <SHA-completo-publicado>`. El operador crea una referencia `devsecops/releases/<SHA>` sin reescribir ramas y despliega desde ella. En la versión instalada, cambiar únicamente git_commit_sha no seleccionó ese commit para Compose: se conserva ese intento como no válido para rollback. La referencia inmutable evita depender de HEAD. Verificar `coolify deployment <uuid>` hasta estado finished y commit correcto antes de registrar cualquier checkpoint.

`verify-rollout.mjs` requiere DEPLOYED_FRONTEND_SHA y consulta el último despliegue, además del health, login y persistencia de una fila ficticia. Sus puntos son before-rollback, after-rollback, after-restore y close. after-restore significa volver a la versión final de código; la restauración de datos independiente tiene su propia evidencia restore-check. No confundir ambas pruebas.

La red de borde del frontend usa la red externa existente `coolify` y `traefik.docker.network=coolify`, para que el proxy seleccione una interfaz alcanzable. Backend, MySQL y backup declaran únicamente la red interna. No se agregan puertos host ni se modifica el proxy compartido. Referencia operativa: [redes en Coolify](https://coolify.io/docs/core/networking-in-coolify).

El recurso Compose de imágenes creado inicialmente es una plantilla detenida; la aplicación Git es el destino efectivo. No desplegar ambos simultáneamente. Los procedimientos GHCR/SSH son alternativas, no requisitos de esta entrega.

Comprobaciones exigidas para declarar terminada la entrega: pipelines de ambos repositorios, 15 escenarios Playwright (5 en cada navegador), ZAP autenticado sobre HTTPS público, revisión de hallazgos, respaldo/restauración practicados y manifiesto final con commits y URL. Un archivo de procedimiento no equivale a evidencia de ejecución.
