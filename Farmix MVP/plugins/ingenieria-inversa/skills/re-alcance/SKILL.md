---
name: re-alcance
description: "Primer paso de cualquier ingeniería inversa: definir objetivo, pregunta a responder, autorización, tipo de artefacto y qué skill de este plugin usar. Úsalo al inicio, cuando el usuario diga \"entiende cómo funciona esto\" sin precisar qué es."
---

# Definir el alcance

## Pasos
1. Pregunta (una sola vez, breve): qué es el objetivo, si es suyo o tiene permiso, y qué quiere saber (arquitectura, datos, protocolo, riesgos, reimplementarlo).
2. Clasifica el objetivo y deriva a la skill:
   - repositorio con código fuente → `re-repositorio`
   - binario, paquete, bundle o instalador → `re-binario-paquete`
   - API o tráfico de red → `re-api`
   - app web, PWA o Electron → `re-web-electron`
   - base de datos o esquema → `re-base-de-datos`
   - archivo con formato desconocido → `re-formato-archivo`
3. Al terminar, usa `re-informe` para el entregable.

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
