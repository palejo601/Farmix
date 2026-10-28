# Etapa 2 · Área A2 — Droguerías

Tablas: `drugstores`, `drugstore_members`.
Fuente: catálogo (`../modelo-datos/modelo-fisico.md`) y código leído en `farmix-app/src/modules/drugstores/service.ts` y `personal-data/service.ts`.
Convención: **[H]** hecho confirmado · **[I]** inferencia · **[R]** recomendación (no aplicada).

## 4.5 · Explicación por tabla

### `drugstores` — «la ficha del establecimiento»
Una fila = una droguería o farmacia (independiente; las cadenas están fuera del alcance del MVP). 11 columnas, 4 CHECK, 2 FK (solo auditoría).

| Columna(s) | Para qué sirve |
|---|---|
| `name` | Nombre (2–120). **No es único**: dos droguerías pueden llamarse igual [H] |
| `city` | Ciudad (2–80); por defecto `'Sincelejo'` [H] |
| `expiry_alert_days` | Con cuántos días de anticipación alerta un vencimiento (1–365, por defecto 60). Alimenta las alertas de `expiration_products` [H: la columna; I: el uso exacto lo tomo de la documentación] |
| `employee_count` | Número de empleados (opcional, 0–10 000) |
| `is_demo` | Marca las droguerías de demostración con datos simulados |
| auditoría | `created_by/updated_by` → `users` (`SET NULL`), fechas y `deleted_at` (borrado lógico) |

Es la **raíz del aislamiento**: 12 tablas la referencian con `drugstore_id` (`ON DELETE CASCADE`). Toda la información operativa pertenece a una droguería.

### `drugstore_members` — «quién trabaja en cuál droguería y con qué rol»
Una fila = una persona dentro de una droguería. Es la tabla puente entre `users` y `drugstores` (relación muchos a muchos con un dato propio: el rol). 9 columnas, 1 CHECK, 4 FK.

| Columna(s) | Para qué sirve |
|---|---|
| `drugstore_id`, `user_id` | Une la persona con la droguería (ambas FK con `CASCADE`) |
| `member_role` | `propietario`, `administrador` u `operador` (CHECK cerrado) |
| auditoría | Quién la creó o modificó, fechas, `deleted_at` |

Reglas de la base (índices únicos parciales, solo entre filas activas) [H]:
- `drugstore_members_active_uq`: una persona **no puede estar dos veces** activa en la misma droguería.
- `drugstore_members_owner_uq`: **un solo propietario activo** por droguería.

Reglas del código (no están en la base) [H]:
- Al crear una droguería, quien la crea queda como `propietario`.
- El propietario gestiona a todos los demás; el administrador solo a operadores; **nadie modifica ni retira al propietario** (error 409).
- Quien no es miembro recibe `404` (no se revela que la droguería existe).

## 4.6 · Integridad y calidad (diagnóstico, sin cambios aplicados)

### Lo que está bien [H]
1. Roles **cerrados** con CHECK y un propietario único garantizado por la base.
2. Unicidad solo entre filas activas: se puede reincorporar a alguien tras retirarlo (borrado lógico).
3. Rangos acotados (días de alerta, empleados, longitudes).
4. Es la raíz clara del aislamiento: las demás tablas la referencian, algunas con FK compuesta `(drugstore_id, id)`.

### Hallazgos
| # | Hallazgo | Tipo | Prioridad sugerida |
|---|---|---|---|
| 1 | El índice garantiza **a lo sumo un** propietario, pero **no al menos uno**: la base permite una droguería activa sin propietario (por ejemplo, retirando la fila). La protección está solo en el código | [H] índice; [I] riesgo si alguien escribe directo en la base | P2 (hoy lo cubre el código; evaluar con el director) |
| 2 | No hay transferencia de propiedad en el código leído (el propietario no se puede modificar ni retirar; no encontré «transfer»). Si el propietario quiere salir, solo queda eliminar su cuenta, lo que **archiva** la droguería | [H] búsqueda sin resultados; [I] limitación funcional | P2 (decidir si es requisito) |
| 3 | Al ejecutarse el borrado de una cuenta: las droguerías de las que era propietario se **archivan**, pero sus miembros pierden acceso y los datos quedan sin dueño. Se borra físicamente la fila de membresía del usuario (`CASCADE`) | [H] código y FK | P3 (informar al usuario antes de borrar) |
| 4 | `drugstores.name` no es único ni tiene verificación de duplicados; puede haber nombres repetidos en la misma ciudad (p. ej. cadenas con varias sedes) | [H] | Observación |
| 5 | **Cadenas fuera del alcance (decisión del estudiante):** el modelo no tiene sedes ni agrupación de droguerías. Para un MVP de droguerías independientes es coherente; se documenta como **limitación**, no como defecto | [H] ausencia de tabla; decisión de alcance | Cerrado como limitación |
| 6 | `city` por defecto `'Sincelejo'`: coherente con la propuesta, pero un valor por defecto fijo puede ocultar errores al ampliar a otras ciudades | [H] | P3 |
| 7 | `drugstore_members.user_id` y `drugstore_id` ya tienen índice útil; `drugstores` solo tiene la PK, suficiente a esta escala | [H] | Sin acción |
| 8 | Sin triggers: `updated_at` lo escribe la aplicación (el código leído lo hace) | [H] | Sin acción |

### Normalización (resumen) [I]
Cumple 1FN/2FN/3FN. `drugstore_members` es la separación correcta para un muchos-a-muchos con atributo propio (el rol); guardarlo como columna en `users` impediría que una persona trabaje en dos droguerías.

## Qué NO se hizo
- Ninguna modificación de código ni de base; no se ejecutaron consultas sobre datos reales.
- No se verificó producción.
- Los hallazgos son para **acordar** antes de cualquier cambio.

## Autoevaluación
1. ¿Por qué el índice `owner_uq` lleva `WHERE member_role = 'propietario' AND deleted_at IS NULL`?
2. ¿Qué diferencia hay entre que la base impida dos propietarios y que impida cero propietarios?
3. ¿Por qué excluir las cadenas simplifica el modelo y qué tendría que cambiar si más adelante se incluyeran?
