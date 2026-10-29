# Propuesta · Registro de establecimiento farmacéutico (Droguería)

> **Estado: PROPUESTA. Nada de esto se aplicó a `farmix-app`.** Es un borrador probado de forma aislada para acordar antes de integrarlo (regla del plan: no modificar el código hasta acordar el diagnóstico y el plan).
> El mensaje traía los marcadores `[lenguaje]` y `[base de datos/ORM]` sin completar; usé lo que ya emplea FARMIX: **TypeScript, Zod 4 y PostgreSQL 16 (SQL puro, como sus migraciones)**.

| Archivo | Qué es | Verificado |
|---|---|---|
| `dv-nit.ts` | Dígito de verificación del NIT (módulo 11, DIAN) | Sí: coincide con 800197268→4, 860002964→4 y 890903938→8 |
| `registro-drogueria.schema.ts` | Validación del JSON completo (Zod) | Sí: 15 comprobaciones en `probar.ts` |
| `0014_drugstore_legal_profile.sql` | Migración con 3 tablas nuevas | Sí, en una base local desechable con las 13 migraciones previas |
| `probar.ts` | Pruebas de las dos primeras piezas (`npx tsx probar.ts` desde `farmix-app`, con los archivos junto a un `node_modules`) | — |

## 1 · Dígito de verificación (DIAN, módulo 11)
Multiplica cada dígito del NIT, **de derecha a izquierda**, por los pesos `3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71`, suma, toma el residuo de dividir entre 11 y: si el residuo es 0 o 1, ese es el DV; si no, el DV es `11 − residuo`.
`calcularDigitoVerificacion('800197268') === '4'`. Acepta puntos y espacios; **rechaza el guion**, porque el DV va en su propio campo. Los vectores de prueba son NIT públicos de entidades conocidas; **no los validé contra el servicio de la DIAN**.

## 2 · Base de datos (3 tablas, 1 migración)
El JSON se reparte así, en vez de ampliar `drugstores` (que ya tiene datos y 12 tablas dependen de ella):
- `drugstore_legal_profiles`: organización, ubicación y control sanitario (1 por droguería activa).
- `drugstore_responsibles`: representante legal y director técnico (`rol`; el director exige perfil y tarjeta/RETHUS).
- `drugstore_einvoice_resolutions`: resoluciones de facturación (1:N, conserva el historial al renovar).
Sigue las convenciones de las migraciones 0001–0013 (uuid, auditoría, `deleted_at`, `UNIQUE (drugstore_id, id)`). Probé que acepta un registro válido y **rechaza**: director sin perfil, rango final menor que el inicial, un segundo perfil activo para la misma droguería y un segundo director técnico activo (índice `drugstore_responsibles_rol_uq`).

## 3 · Recomendación para `area_local_m2 ≥ 20` y «Droguería» en el nombre
**Cómo validar (ya implementado en el esquema):**
- Área: `z.number().min(AREA_MINIMA_M2)` en Zod (mensaje claro al usuario) y, **cuando la norma esté confirmada**, un `CHECK (area_local_m2 >= 20)` en la base (está comentado al final de la migración). Mientras tanto la base solo exige `> 0`.
- Nombre: normalizar (`NFD`, quitar tildes, minúsculas) y buscar `drogueria`, así «Droguería», «DROGUERIA» y «Drogueria» valen. Un `CHECK` equivalente en SQL también está comentado.
- Mantener ambas reglas como **constantes** (`AREA_MINIMA_M2`, `PALABRA_OBLIGATORIA`) para cambiarlas en un solo lugar.

**⚠️ No pude confirmar las dos reglas como obligación legal.** Busqué en la web:
- La [Resolución 2955 de 2007](https://normograma.invima.gov.co/normograma/compilacion/docs/resolucion_minproteccion_2955_2007.htm) dice que la droguería debe cumplir las condiciones de infraestructura del numeral 1.1 (Cap. II, Título I) y las áreas del 1.1.2 (Cap. V) de la Resolución 1403 de 2007. **No vi la cifra de 20 m² en los resultados**; hay que leer esos numerales.
- Sobre que el nombre deba contener «Droguería», **no encontré una fuente**. Ni siquiera la diferencia entre «droguería» y «farmacia-droguería» quedó clara.
- Una guía de la [Alcaldía de Barranquilla](https://barranquilla.gov.co/wp-content/uploads/dlm_uploads/2025/10/requisitos-para-la-inscripcion-autorizacion-para-el-funcionamiento-de-droguerias.pdf) indica que la droguería puede ser dirigida por un **Químico Farmacéutico, un Tecnólogo en Regencia de Farmacia o un Expendedor de Drogas** (Decreto 780 de 2016, art. 2.5.3.10.11). Tu JSON solo admite los dos primeros: si registras droguerías con **Expendedor de Drogas**, faltaría esa opción.
Hasta confirmarlo con la secretaría de salud o el texto de la norma, trátalas como reglas **de tu producto**, no como cita legal.

## Observaciones que conviene decidir (no aplicadas)
1. **Alcance:** estos datos (NIT, facturación electrónica, CIIU, régimen tributario) **no están en la propuesta de trabajo de grado** ni en sus objetivos. Añadirlos amplía el MVP; consúltalo con tu director (pregunta 2 de su hoja).
2. **Datos personales (Ley 1581):** nombre y documento del representante legal y del director técnico son datos personales de terceros (ver hallazgo A4-4). Recomiendo acceso solo para propietario y administrador, y **no registrarlos en `audit_logs`**.
3. **Falta definir:** valores de `estado_concepto_sanitario` (lo dejé como texto libre), lista de `tipo_documento` (propuse CC, CE, PA, PPT, PEP) y si `fecha_vencimiento` de la resolución debe disparar una alerta (como las de vencimientos).
4. **Pendiente para integrarlo:** esquema Drizzle (`schema.ts`), ruta y servicio en el patrón `routes → schema → service`, formulario en React, pruebas con la matriz existente, y migrar con respaldo previo. No lo hice porque exige acordar el plan primero.
