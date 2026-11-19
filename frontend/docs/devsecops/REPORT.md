# SIDNAM: implementación DevSecOps académica

## Objetivo y alcance

Integrar controles de seguridad verificables en un sistema funcional con frontend React/Vite, backend NestJS/TypeORM y MySQL. El sistema original tiene varios autores; el aporte académico individual consiste en la implementación DevSecOps, sus correcciones, despliegue y evidencias. El profesor autorizó reutilizar SIDNAM. Declarar la asistencia recibida según las reglas del curso.

La demostración usa una instancia independiente en Coolify, datos ficticios y cuentas de administrador de catálogos, lectura e inactivo. El flujo evaluado es autenticación y administración de cinco catálogos. Producción y sus datos quedan fuera de las pruebas. Los commits, ejecuciones, resultados y rutas de evidencia están en [STATUS.md](STATUS.md).

## Implementación por requisito

| Requisito | Implementación | Evidencia verificable |
|---|---|---|
| SAST | Semgrep con reglas CI vendorizadas y reglas propias sobre secretos de respaldo y synchronize | JSON de resultados/errores, hash de reglas, digest de imagen y manifiesto por repositorio |
| SCA | npm audit completo y productivo con lockfiles; SBOM CycloneDX | Reportes iniciales/finales y árbol de componentes |
| Secretos | Gitleaks sobre archivos actuales y todo el historial disponible | JSON redactado, fingerprints históricos y excepciones acotadas con vencimiento |
| E2E | Playwright: cinco escenarios en Chromium, Firefox y WebKit | HTML, JSON, JUnit, navegador/versión, URL, fecha y resultado de cada escenario |
| DAST | ZAP autenticado, OpenAPI restringida, exploración pasiva y activa | Reporte original, alertas, URLs, prueba de acceso protegido y revisión por instancia |
| Despliegue | Aplicación Coolify separada con HTTPS, contenedores y base propia | Commit realmente desplegado, salud pública y comprobaciones de persistencia |

## Ejecución y correcciones

La línea base de dependencias registró 31 vulnerabilidades en frontend y 58 en backend, incluidas altas y críticas. Se actualizaron dependencias compatibles, se retiraron paquetes innecesarios y se adaptó el uso de Puppeteer. El resultado documentado es frontend sin vulnerabilidades reportadas por npm audit y backend con 14 moderadas, sin altas ni críticas. Estas cifras representan entradas del reporte de dependencias y pueden incluir cadenas transitivas de un mismo aviso.

Se eliminaron secretos literales de respaldo y registros parciales de claves; se impusieron validaciones de entorno. Las cookies son propias del host, HttpOnly y Secure en HTTPS. Se incorporaron verificaciones de origen para escrituras y de JWT/permisos en WebSocket. Las migraciones tienen checksum y no se utiliza synchronize en staging/producción. Correo, Cloudinary y consultas externas permanecen deshabilitados en staging.

Gitleaks encontró dos secretos reales históricos del backend. El propietario confirmó que ya fueron revocados. Se conservaron las detecciones originales redactadas y se registraron dos excepciones exactas solo para historial. Un secreto nuevo o vigente sigue bloqueando; no se borró ni reescribió el historial.

La integración construye ambos componentes y levanta MySQL real en un runner efímero. El frontend contiene un paquete de fuentes del backend asociado a su commit y hash, verificado antes de construir. El pipeline propio del backend examina su historial completo. La copia empaquetada en la integración se identifica expresamente como código actual, sin historial original.

Se conservaron los intentos fallidos: problemas de configuración de build, compatibilidad del runner, conectividad Docker de ZAP y enrutamiento del proxy. Las correcciones posteriores se registraron en commits independientes. No se cuentan las ejecuciones fallidas o canceladas como aprobadas.

## Tratamiento de alertas y política

Bloquean hallazgos Semgrep de severidad ERROR, dependencias altas/críticas, secretos no autorizados, errores de ejecución, E2E fallidos y alertas DAST altas sin resolver. Las dependencias moderadas y las mejoras CSP/SRI se registran en [FINDINGS.md](FINDINGS.md).

ZAP produjo heurísticas altas SQLi/traversal en creaciones con unicidad. Se revisó el servicio TypeORM y se reprodujeron valores normales, SQL y rutas como texto literal: todos crearon una fila con 201 y rechazaron el duplicado con 409. La clasificación exige coincidencia exacta de commit, ruta, método, parámetro, ataque y confianza, además de reproducción en cada ejecución. Las alertas originales conservan su severidad; la clasificación aparece separada. Ver [DAST-TRIAGE.md](DAST-TRIAGE.md).

## Operación y conservación

La VPS mantiene un respaldo diario con siete posiciones en un volumen separado. Se restauró un dump ficticio local en otro MySQL sin red y se compararon los conteos de 69 tablas. Esta prueba no equivale a recuperar una VPS perdida. La reversión de código se verifica por commit y persistencia de una fila ficticia, sin restaurar ni borrar la base.

Las herramientas e imágenes se identifican por versión/digest. Los manifiestos contienen fecha UTC y Costa Rica y SHA-256 de los archivos. CI conserva artefactos 90 días. El paquete final contiene copias sanitizadas con un manifiesto raíz; excluye entornos, tokens, sesiones y SQL. Los manifiestos internos describen originales y el manifiesto raíz describe las copias entregadas.

La publicación es controlada mediante el token local de Coolify y referencias inmutables de release. La rama académica conserva el trabajo sin fusionarlo a main. El procedimiento operativo está en [DELIVERY.md](DELIVERY.md), y [DEMO.md](DEMO.md) contiene el guion de defensa.

## Límites

La cobertura E2E/DAST se limita al flujo definido, con DAST activo de cinco minutos y un hilo. No se prueba seguridad absoluta ni cobertura total de SIDNAM. Permanecen las dependencias moderadas documentadas, mejoras de CSP/SRI, vida residual de access tokens de hasta 15 minutos y la necesidad de respaldo externo para recuperación ante pérdida de VPS. El resultado válido es el asociado a cada commit y reporte; debe repetirse cuando cambie código, dependencias o infraestructura.
