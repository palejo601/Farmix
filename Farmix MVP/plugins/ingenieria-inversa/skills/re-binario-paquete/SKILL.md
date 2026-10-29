---
name: re-binario-paquete
description: "Analiza un artefacto distribuido sin fuente (binario, paquete npm/pip/jar, bundle JS, instalador, APK) para saber qué contiene, qué dependencias usa y qué hace. Úsalo cuando la afirmación dependa de lo que realmente se entrega y no de su código fuente."
---

# Binario o paquete

## Flujo
1. **Metadatos primero:** manifiesto, versión, firma, hashes, licencias, dependencias declaradas.
2. **Aislamiento:** descomprime en un directorio nuevo y vacío; los scripts propios van en otro. No ejecutes el artefacto fuera de un entorno aislado.
3. **Estructura:** lista de archivos, tamaños, tipos (`file`, `strings`, imports/exports, `ldd` o equivalente).
4. **Comportamiento declarado vs. observado:** permisos pedidos, URLs y dominios embebidos, scripts de instalación, uso de red/archivos.
5. **Descompilar o desempaquetar solo si hace falta**, con herramientas locales (por ejemplo `javap`, `objdump`, `asar`, `source-map`); reporta lo que no se pudo recuperar.
6. **Riesgos:** código ofuscado, descarga y ejecución remota, secretos embebidos.

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
