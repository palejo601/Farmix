---
name: re-formato-archivo
description: "Descubre la estructura de un archivo o formato desconocido (binario, CSV raro, xlsx, volcado, log) con cabecera, campos, codificación, delimitadores y reglas. Úsalo cuando haya que leer o convertir un archivo sin especificación."
---

# Formato de archivo

## Flujo
1. **Identificación:** `file`, extensión, tamaño, primeros bytes (magic numbers), codificación.
2. **Contenedores:** si es zip/xlsx/docx, lista su contenido y lee los XML internos.
3. **Estructura:** cabecera, registros, delimitadores, longitudes fijas, endianness, tablas de contenido.
4. **Hipótesis y prueba:** escribe un parser mínimo en el directorio de trabajo y valida con varios ejemplos; reporta el porcentaje que analiza bien.
5. **Salida:** especificación del formato, parser de ejemplo y casos que fallan.
6. Trabaja sobre copias; nunca modifiques el original ni expongas datos personales.

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
