# 05 · Pruebas

## Qué son
Una **prueba automática** es un pequeño programa que usa FARMIX y comprueba que responde lo esperado.
Es el control de calidad antes de dispensar: si alguien rompe algo, una prueba lo dice antes de que llegue a una droguería.
En su propuesta, corresponden a la **Fase 4: pruebas funcionales con datos simulados**.

| Tipo | Herramienta | Dónde | Cuántas |
|---|---|---|---|
| Pruebas de la API y de la base de datos | Vitest | `farmix-app/tests/*.test.ts` | 391 en 21 archivos (399 en 22 con la rama `pwa-instalable`) |
| Recorrido en navegador real | Playwright | `farmix-app/frontend/e2e/ui-smoke.cjs` | 22 pasos |

## Qué cubre cada archivo (ejemplos)
| Archivo | Qué comprueba |
|---|---|
| `waste.test.ts` | Clasificación cerrada; medicamento vencido ≠ riesgo biológico (en la API **y** en la base) |
| `segregation.test.ts` | Porcentaje calculado al consultar; `correctos ≤ revisados` |
| `expirations.test.ts` | Clasificación de alertas en los límites 0/59/60/61 días; pérdidas con cifras exactas |
| `protected-routes.test.ts` | Las 66 rutas privadas responden `401` sin sesión |
| `drugstores.test.ts` | Matriz de roles; una cuenta ajena recibe `404` en todas las rutas con id |
| `smoke.test.ts` | Servidor real: el flujo completo de un usuario nuevo |

La lista completa, con resultados y pendientes, está en [`farmix-app/docs/05-resultado-de-pruebas.md`](../../farmix-app/docs/05-resultado-de-pruebas.md).

## Cómo leer el resultado
- `✓` u `ok`: la prueba pasó. `×` o `FAIL`: falló, y debajo aparece el archivo, la línea y lo esperado frente a lo recibido.
- Al final: `Tests 391 passed (391)` significa todo en verde.

## Scripts
| Script | Qué hace |
|---|---|
| `bash scripts/pruebas.sh` | Todas las pruebas contra la base **desechable** `farmix_test` (se borra y recrea; el script se niega a usar una base cuyo nombre no contenga «test») |
| `bash scripts/pruebas.sh tests/waste.test.ts` | Solo un archivo |
| `DEMO_PASSWORD='…' bash scripts/prueba-navegador.sh` | Los 22 pasos en el navegador; antes, encienda todo con `07-scripts-generales/levantar-todo.sh` |

## Autoevaluación
1. ¿Por qué las pruebas usan una base distinta de `farmix_dev`?
2. Una prueba fallaba solo entre las 7 p. m. y la medianoche. ¿Qué tenía que ver la zona horaria? (Ver la rama `pwa-instalable`.)
3. ¿Qué diferencia hay entre una prueba de la API y el recorrido en navegador?
