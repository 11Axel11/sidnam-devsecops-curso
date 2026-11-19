# SIDNAM — entrega individual DevSecOps

Cuenta académica: **11Axel11**. Frontend React/Vite, backend NestJS/TypeORM y MySQL, desplegados en un staging independiente con datos ficticios.

- Frontend: https://sidnam-devsecops.187.124.88.238.sslip.io
- Backend público, comprobación de salud: https://sidnam-devsecops.187.124.88.238.sslip.io/api/health
- [GitHub Actions](https://github.com/11Axel11/sidnam-devsecops-curso/actions/workflows/devsecops.yml)
- [Autoría y procedencia](NOTICE.md)
- [Alcance, riesgos y evidencias históricas](frontend/docs/devsecops/REPORT.md)
- [Registro de esta publicación](docs/ENTREGA.md)

## Requisitos del curso

| Control | Implementación | Evidencia |
|---|---|---|
| SAST | Semgrep: reglas CI vendorizadas y reglas propias; ERROR bloquea | semgrep.json, errores y digest de imagen |
| SCA | npm audit completo/productivo y SBOM CycloneDX | npm-audit.json, npm-audit-production.json y sbom.json |
| Secretos | Gitleaks sobre código actual e historial de este repositorio | gitleaks-dir.json y gitleaks-git.json, redactados |
| E2E | Playwright en Chromium, Firefox y WebKit | 15 casos; HTML, JSON y JUnit |
| DAST | ZAP autenticado, OpenAPI acotada y análisis activo de 5 minutos | alertas originales, cobertura, HTML y clasificación reproducida |

El workflow raíz analiza frontend y backend, construye ambos, ejecuta pruebas de seguridad y levanta una aplicación real con MySQL en un runner efímero para E2E y DAST. No necesita secretos de producción ni un token de Coolify. El despliegue público se evalúa adicionalmente desde un entorno de operación privado.

## Reproducir

Requisitos: Node 22, Docker Linux y acceso a los registros de imágenes y paquetes.

```sh
cd frontend
npm ci
npm run staging:init
npx playwright install --with-deps chromium firefox webkit
BACKEND_DIR=../backend npm run staging:verify
```

En PowerShell: `$env:BACKEND_DIR='../backend'` y luego `npm run staging:verify`. Las claves ficticias se generan localmente en un archivo ignorado por Git. Para los controles estáticos, ejecutar `npm ci` y `npm run security:scan` en cada componente, tras descargar las imágenes de scripts/security/images.json.

El código original de SIDNAM es colaborativo. La entrega individual corresponde a DevSecOps y su evaluación; se utilizó asistencia de IA. Esta publicación conserva las fuentes actuales revisadas y su procedencia, con un historial académico nuevo. Los dos secretos revocados del historial privado se documentan en reportes redactados; sus valores y aquel historial no forman parte de esta publicación.

Los reportes históricos del 18 de noviembre corresponden a ejecuciones previas. Los resultados nuevos de este repositorio se identifican por sus propias URLs y commits. Consultar docs/ENTREGA.md antes de interpretar cualquier estado como aprobado.
