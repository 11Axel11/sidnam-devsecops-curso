# Guion de presentación

URL: https://sidnam-devsecops.187.124.88.238.sslip.io

1. Mostrar los dos repositorios y sus ramas `devsecops/curso-seguridad`; explicar que se conservó la autoría original y que la implementación DevSecOps es el aporte individual.
2. Mostrar el pipeline Security de cada repositorio y Full DevSecOps integration del frontend; abrir sus artefactos sanitizados. Enseñar SAST Semgrep, SCA completo/productivo, SBOM y Gitleaks actual/histórico.
3. Ingresar con cédula ficticia `900000001` y la contraseña de `E2E_ADMIN_PASSWORD` del archivo privado `.env.vps.staging`. No mostrar ese archivo en la proyección. El usuario administra catálogos, no todos los módulos clínicos.
4. Abrir Ajustes → Catálogos; agregar un nombre de prueba, recargar y comprobar persistencia. Desactivarlo y reactivarlo. Cerrar sesión.
5. Ingresar con `900000002` y su contraseña de lectura. Mostrar que no puede crear, y contrastar con la prueba automatizada de rechazo 403 en el backend.
6. Mostrar el reporte Playwright HTML/JSON/JUnit y las tres plataformas. Mostrar la URL HTTPS, health y evidencia de cookies HttpOnly/Secure host-only.
7. Mostrar el reporte ZAP original, cobertura autenticada y clasificación de alertas. Explicar el falso positivo diferencial 201/409 con los resultados de reproducción, sin esconder las alertas altas originales.
8. Mostrar el respaldo automático de staging y la restauración independiente verificada. Explicar que no se usaron datos reales de residentes ni credenciales de producción.

Puntos para defender: SAST ve código; SCA ve dependencias; Gitleaks ve secretos, incluido historial; E2E prueba flujos; DAST observa el sistema en ejecución. Ninguna herramienta demuestra por sí sola que el sistema esté libre de vulnerabilidades. Las revocaciones históricas están confirmadas por el propietario y delimitadas por fingerprint; los hallazgos moderados y las limitaciones de cobertura permanecen documentados.
