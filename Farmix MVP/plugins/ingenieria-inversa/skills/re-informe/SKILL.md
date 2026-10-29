---
name: re-informe
description: "Entregable final de una ingeniería inversa: informe en español con arquitectura, flujos, datos, riesgos, hallazgos etiquetados y límites de la verificación. Úsalo al terminar cualquier otra skill de este plugin."
---

# Informe

## Estructura
1. Resumen en 5 líneas y alcance (qué se analizó y con qué autorización).
2. Arquitectura y componentes (diagrama Mermaid o texto).
3. Flujos clave paso a paso, con evidencia archivo:línea.
4. Datos y formatos.
5. Dependencias y riesgos (seguridad, deuda, fragilidad).
6. Tabla de hallazgos: ID, `[H]/[I]/[R]`, evidencia, prioridad P0-P3.
7. Qué **no** se pudo verificar y por qué; preguntas abiertas.
8. Ficha de seguimiento: qué se hizo, qué sigue, qué decide el usuario.

## Reglas comunes
1. **Autorización:** confirma que el objetivo es del usuario o que tiene permiso. No ayudes a evadir licencias, DRM o protecciones, ni a extraer credenciales; si aparece un secreto, repórtalo sin copiarlo.
2. **Solo lectura:** no modifiques el objetivo; ejecuta código no confiable solo en un directorio aislado y nunca contra producción.
3. **Etiqueta:** `[H]` hecho (con evidencia: archivo:línea o salida), `[I]` inferencia, `[R]` recomendación. No inventes nada y no afirmes haber ejecutado lo que no ejecutaste.
4. **Ahorra tokens:** busca antes de leer, lee por partes, resume.
