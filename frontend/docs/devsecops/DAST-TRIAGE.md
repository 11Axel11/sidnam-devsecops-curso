# Revisión de alertas sobre creación de catálogos

ZAP detectó Path Traversal (regla 6, confianza baja) y SQL Injection (40018, confianza media) en JSON `nombre` de cinco POST de catálogo. Se conservan las alertas originales con su severidad en los reportes; no se deshabilitan esas reglas.

El backend revisado es exclusivamente `6b41ddea71771a85035daa4fc09f0b2405e10b2a`. `CatalogoService.crear` usa `Repository.findOne`, `create` y `save`, sin concatenar SQL ni acceder al sistema de archivos. Cada nombre nuevo devuelve 201 y cada duplicado 409: esa diferencia de estado puede activar heurísticas diferenciales.

Para clasificar una alerta se exige coincidencia exacta de ruta, método POST, parámetro JSON, regla, ataque y confianza observados, ausencia de evidencia de contenido filtrado y la revisión original del código. Además, cada ejecución reproduce el comportamiento con nombres únicos: texto normal, una expresión SQL entre comillas y una secuencia de traversal. Deben guardarse literalmente, retornar 201 y luego 409 para el duplicado y aparecer exactamente una vez en el listado. Solo entonces se marcan los IDs concretos de esa ejecución como falsos positivos. Las filas de prueba se desactivan al terminar.

`stateful-triage.json` guarda estos resultados. Cualquier alerta distinta, cambio del commit revisado o fallo de las verificaciones mantiene el bloqueo. Esta revisión acotada no demuestra ausencia general de SQLi o traversal en otras rutas. Las alertas medias de CSP unsafe-inline (necesaria para estilos dinámicos actuales) y SRI sobre recursos propios quedan como mejoras documentadas; no se confunden con hallazgos altos corregidos.
