# Estado comprobado de la entrega SIDNAM

Actualización: 18 de noviembre de 2026, Costa Rica. Implementación y validación terminadas para el alcance académico descrito. Los cinco controles requeridos se ejecutaron, la integración fue aprobada y el frontend/backend están desplegados y evaluados por HTTPS. Permanecen los riesgos explícitos de FINDINGS.md.

## Fuente y despliegue

- URL: https://sidnam-devsecops.187.124.88.238.sslip.io
- Frontend desplegado: `2e6697a33b3966138d5ca5ae823e298225511eca`.
- Backend: `6b41ddea71771a85035daa4fc09f0b2405e10b2a`.
- Coolify: aplicación `sidnam-devsecops-course`, proyecto SIDNAM DevSecOps, ambiente staging; despliegue `lau62gh11rdjg6r7q306tcgx`, finished con el SHA esperado.
- Fuentes en ambos repositorios: rama `devsecops/curso-seguridad`. Coolify usa una referencia inmutable `devsecops/releases/<SHA>`; no se fusionaron cambios a main.
- El SHA integrado `0eec6dbfe73c2950b94b511696f9c45a06892910` y el desplegado solo difieren en documentos y utilidades de operación dentro de docs/. La aplicación, dependencias y configuración de pruebas son iguales. Los documentos finales posteriores no cambian el despliegue.

## Comprobaciones

| Control | Resultado comprobado |
|---|---|
| Semgrep, SCA, SBOM y Gitleaks frontend | PASS local en commit limpio desplegado y Security CI aprobado |
| Semgrep, SCA, SBOM y Gitleaks backend | PASS local y Security CI aprobado; dos secretos históricos revocados registrados por fingerprint |
| SCA final | Frontend: 0. Backend: 14 moderadas, 0 altas y 0 críticas; 3 entradas moderadas en vista productiva |
| Pruebas de configuración/auth/migraciones backend | 12 aprobadas en CI |
| Playwright público final | PASS: 15/15 en Chromium/Firefox/WebKit, URL HTTPS y metadatos conservados |
| DAST público final | PASS: autenticado, 38 URLs (28 de API); 34 instancias: 17 informativas, 7 medias y 10 altas clasificadas como falsos positivos con reproducción en esta ejecución; ninguna alta pendiente |
| Integración completa GitHub | PASS: build de ambos componentes, controles estáticos, 12 pruebas del backend, 15 E2E y DAST autenticado en runner Linux |
| Restauración independiente | PASS: dump ficticio local restaurado en MySQL sin red; conteos iguales en 69 tablas |
| Rollback de código | PASS: 45b2727 → 1806166 → 2e6697a; fila ficticia ID 97 persistió y se desactivó al cerrar |
| Salud pública y respaldo | PASS: tres respuestas HTTPS 200 con environment staging y log de respaldo completado observado tras el despliegue final |

## Pipelines

- [Security frontend desplegado](https://github.com/KarinaMD16/sidnam-administrativa/actions/runs/44432062107): success.
- [Security backend](https://github.com/KarinaMD16/sidnam-backend/actions/runs/44425760466): success.
- [Integración completa](https://github.com/KarinaMD16/sidnam-administrativa/actions/runs/44432005950): success; artefacto 14487234225 conservado localmente.

Los intentos fallidos y cancelados permanecen en GitHub y en artifacts/. El intento de seleccionar SHA mediante git_commit_sha que volvió a HEAD no se cuenta como rollback. La comprobación prematura 00-43-26 está marcada SUPERSEDED; se reemplazó por checkpoints que consultan el despliegue realmente terminado.

## Evidencia local privada

Los siguientes directorios están en artifacts/ del frontend, excepto donde se indica. Se excluyen de Git intencionalmente. El paquete final los organiza por nombre de control y recalcula hashes de las copias sanitizadas.

- Línea base: `2026-11-18T22-26-44-399Z-baseline`.
- Seguridad frontend: `2026-11-19T00-49-35-809Z-security`.
- Seguridad backend: `artifacts/2026-11-19T00-29-36-522Z-security` en sidnam-backend.
- Playwright público: `playwright/` (HTML, JSON y JUnit; ejecución 00:56:32 UTC, 15 aprobadas).
- Verificación dinámica pública: `2026-11-19T00-55-04-397Z-dynamic`; DAST final: `2026-11-19T00-56-33-572Z-dast`, incluyendo alertas originales y stateful-triage.json. Las 10 instancias altas mantienen su severidad original; la clasificación no modifica alerts.json ni report.html.
- Salud/cabeceras/respaldo observado: `2026-11-19T00-58-33-587Z-runtime`.
- CI aprobado: `2026-11-19T01-01-43-170Z-ci-summary` y `ci-44432005950/` (reportes descargados de GitHub).
- Alertas originales locales con falsos positivos: `2026-11-19T00-13-37-624Z-dast`; reproducción pública: `2026-11-19T00-25-38-656Z-dast-triage`. El reporte inicial conserva FAIL.
- Restauración: `2026-11-19T00-10-04-831Z-restore-check`.
- Rollback: `2026-11-19T00-45-34-841Z-rollout-check`, `2026-11-19T00-51-55-212Z-rollout-check`, `2026-11-19T00-55-01-039Z-rollout-check`, `2026-11-19T00-55-03-682Z-rollout-check`.

## Acciones del estudiante

Presentar y defender la implementación; leer REPORT.md, FINDINGS.md y DEMO.md. Acceder con las cuentas ficticias y contraseñas del archivo local privado .env.vps.staging, sin proyectarlo ni adjuntarlo. Entregar el informe y paquete mediante el canal académico autorizado. Si el profesor necesita abrir los repositorios privados, sus propietarios deben concederle acceso. Revocar el token temporal de Coolify al terminar su uso.

Las mejoras pendientes y límites están en FINDINGS.md. No hay afirmación de cobertura total ni de ausencia absoluta de vulnerabilidades.

## Paquete privado

Se genera mediante `node docs/devsecops/package-evidence.mjs .private/delivery-selection.json`. Contiene informe, resultados iniciales/finales, reportes públicos, artefactos CI descargados, restauración y rollback. El README del paquete sirve de índice. Su manifiesto raíz identifica las copias sanitizadas y el archivo .tar.gz tiene un SHA-256 independiente. No contiene entornos, SQL ni sesiones. Los manifiestos internos describen los originales, por lo que sus hashes pueden diferir de las copias redactadas.
