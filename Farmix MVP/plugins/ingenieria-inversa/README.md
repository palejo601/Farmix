# Plugin ingenieria-inversa

Ocho skills para reconstruir cómo funciona un sistema a partir de lo observable. Todas son de solo lectura, piden autorización y etiquetan cada afirmación como hecho, inferencia o recomendación.

| Skill | Para qué |
|---|---|
| `re-alcance` | Definir objetivo y elegir la skill |
| `re-repositorio` | Código fuente: módulos, flujos, datos |
| `re-binario-paquete` | Artefactos sin fuente |
| `re-api` | Contrato de una API |
| `re-web-electron` | Interfaces web, PWA y Electron |
| `re-base-de-datos` | Modelo de datos e integridad |
| `re-formato-archivo` | Formatos desconocidos |
| `re-informe` | Entregable final |

**Estado:** escrito, **no probado** en un caso real. Es un plugin propio, no el proyecto «REA» de GitHub.

**Instalar en una sesión (prueba):** `claude --plugin-dir "Farmix MVP/plugins/ingenieria-inversa"`
**O como skills sueltas:** `cp -r "Farmix MVP/plugins/ingenieria-inversa/skills/"* ~/.claude/skills/`
