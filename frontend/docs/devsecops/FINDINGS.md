# Registro de hallazgos y límites

La evidencia concreta está indexada en STATUS.md y en el paquete privado. Revisión: 18 de noviembre de 2026, Costa Rica. Los resultados representan los commits y la cobertura documentados.

| ID | Hallazgo inicial | Tratamiento y comprobación |
|---|---|---|
| CFG-01/02 | Claves literales de respaldo en Swagger y JWT | Variables obligatorias, mínimos de longitud y rechazo de configuración insegura; pruebas del backend y autenticación real E2E/DAST |
| CFG-03 | Cookies compartidas con .sidnam.org | Prefijo exclusivo de staging, host-only, HttpOnly y Secure sobre HTTPS; aserciones Playwright |
| CFG-04 | Frontend/WebSocket apuntaba a producción | Configuración de mismo origen; frontend y API reales en el mismo staging |
| CFG-05 | Sincronización automática del esquema | Migración versionada con checksum, ejecución repetible sin synchronize; MySQL vacío en CI y restauración comparada |
| LOG-01 | Registro parcial de clave de correo | Registro eliminado; integraciones externas deshabilitadas en staging |
| WS-01 | Notificaciones sin control suficiente | Verificación de origen, JWT y permisos; pruebas unitarias de configuración. E2E no valida entrega de notificaciones |
| SCA-01 | Frontend: 31 vulnerabilidades (16 altas, 1 crítica). Backend: 58 (26 altas, 3 críticas) | Actualizaciones y eliminación de dependencias innecesarias. Resultado: frontend 0; backend 14 moderadas, ninguna alta/crítica; audits completos y productivos conservados |
| SEC-01 | Dos secretos reales en historial del backend | Propietario confirmó revocación. Excepciones limitadas a dos fingerprints históricos exactos con vencimiento; hallazgos originales redactados conservados |
| DAST-01 | Heurísticas SQLi/traversal en POST de catálogos | Código revisado y reproducción literal: creación 201/duplicado 409. Clasificación por instancia, commit y prueba real; ver DAST-TRIAGE.md |
| OPS-01 | Acceso público intermitente con servicios internos sanos | Red de borde explícita para frontend y etiqueta Traefik; backend/MySQL conservan red interna |

## Riesgos pendientes

- Las 14 vulnerabilidades moderadas del backend incluyen dependencias transitivas de CLI y tres entradas productivas relacionadas con TypeORM/glob/minimatch. Actualizar el framework principal exige migración y regresión separadas. No se declara que todas sean exclusivas de desarrollo ni que estén corregidas. Seguimiento: mantenedor de SIDNAM; revisar antes del 16 de febrero de 2027 y cuando cambien los avisos.
- ZAP señala políticas CSP mejorables y ausencia de SRI en recursos propios. Los estilos dinámicos actuales necesitan style-src unsafe-inline. Sustituirlos requiere revisar los componentes de interfaz antes de promover cambios a producción. Las observaciones informativas de cache-control requieren revisar la política por ruta al ampliar la cobertura; la prueba actual usa datos ficticios y no acredita la política de caché de los módulos clínicos.
- Logout borra cookies y revoca refresh; un access token copiado puede durar hasta 15 minutos. No se implementó revocación inmediata de todos los access tokens.
- DAST activo acotado a cinco minutos y un hilo, autenticación y cinco catálogos. Playwright cubre cinco escenarios en tres navegadores. No se afirma cobertura de módulos clínicos, pagos, PDF o todo SIDNAM.
- Los respaldos remotos de siete días residen en un volumen independiente de la misma VPS: no protegen contra pérdida de toda la VPS. La restauración se practicó con datos ficticios locales en un MySQL independiente, sin red; no se presenta como restauración remota ni recuperación externa.
- La rama académica no sustituye a main. Protección de ramas y acceso del profesor a repositorios privados dependen de sus propietarios. CI conserva reportes 90 días; conservar el paquete local privado.
