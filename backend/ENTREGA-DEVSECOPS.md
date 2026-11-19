# Backend de la entrega individual SIDNAM DevSecOps

Repositorio de trabajo del estudiante: https://github.com/11Axel11/sidnam-backend-DevSecOps

Frontend e integración: https://github.com/11Axel11/sidnam-administrativa-DevSecOps

El sistema SIDNAM original es un proyecto colaborativo; se conserva su historial y autoría. La entrega individual corresponde a los controles DevSecOps, correcciones de seguridad, pruebas, despliegue y análisis de evidencias, con asistencia técnica de herramientas de IA. El estudiante debe comprender y defender los resultados personalmente y declarar la asistencia según las reglas del curso.

Este fork privado es un repositorio de trabajo. La consigna final del profesor requiere un repositorio público propio; la publicación del código compartido requiere autorización de sus propietarios. No convertir este historial en público: contiene valores históricos reales revocados, aunque los reportes de Gitleaks estén redactados. La publicación académica se prepara desde fuentes actuales revisadas y con procedencia documentada.

`npm run security:scan` ejecuta Semgrep, SCA con npm audit, SBOM y Gitleaks actual/histórico. `npm run test:security` comprueba configuración, cookies, WebSocket y checksum de migraciones. Los reportes privados están en artifacts/ y CI los conserva 90 días.

El frontend empaqueta el backend por commit y SHA-256. El commit de fuentes `6b41ddea71771a85035daa4fc09f0b2405e10b2a` sigue siendo la versión funcional revisada; este documento no modifica su comportamiento. No presentar el contenido completo de SIDNAM como autoría individual ni publicar entornos, credenciales o datos productivos.
