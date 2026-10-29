# Wireframes de baja fidelidad (Fase 2)

Dibujos simples, en grises, de **todas las pantallas** de FARMIX (17). Responden a «wireframes» de la Fase 2 de la propuesta.

> ⚠️ **Declaración de origen (para el informe):** estos wireframes se **reconstruyeron a partir del sistema ya construido**, de sus pantallas y de su esquema de datos; **no son diseños previos** al desarrollo. Sirven como documentación del diseño actual y para discutir mejoras con el director y los usuarios. Si la universidad exige wireframes anteriores al código, habría que presentarlos como «reconstruidos» o dibujar otros.

| Archivo | Pantalla | Req. |
|---|---|---|
| `01-ingreso-registro` | Ingreso, registro | R6, R12 |
| `02-inicio` | Inicio: ciclo Registrar·Medir·Analizar·Mejorar, alertas e indicadores | R2, R5 |
| `03-vencimientos` | Lista, filtros, cifras y formulario de producto | R2, R3 |
| `04-residuos` | Gráfica, totales, lista y formulario de residuo | R1 |
| `05-segregacion` | Indicador, lista y formulario de verificación | R5 |
| `06-personal` | Trabajadores, capacitaciones y formulario | Propuesta F2 |
| `07-diagnostico` | Requisitos obligatorios (Cumple / No cumple / No aplica) | O1 |
| `08-plan-de-mejora` | Tablero Pendiente · En curso · Cerrada | O1b |
| `09-reporte` | Reporte de gestión imprimible | R4 |
| `10-normativa` | Línea de tiempo del marco legal | O1 |
| `11-importar` | Importar Excel/CSV con vista previa | X2 |
| `12-migrar` | Migrar datos locales: vista previa, confirmar, revertir | X3 |
| `13-miembros` | Miembros y roles | R8 |
| `14-configuracion` | Datos de la droguería y zona de riesgo | R7 |
| `15-cuenta` | Perfil, contraseña, privacidad y borrado de cuenta | R6, R12 |
| `16-mis-droguerias` | Lista de droguerías y ventana «Nueva droguería» | R7 |
| `17-recuperar-contrasena` | Recuperación en dos pasos | R6 |

Cada uno existe como `.svg` (editable en el navegador, Figma, Inkscape o Canva) y como `.png` (para insertar en Word).
Las **notas amarillas** marcan reglas de negocio que la pantalla debe respetar (por ejemplo, «correctos no puede superar a revisados»).

## Cómo se hicieron y cómo cambiarlos
`python3 generar_wireframes.py` regenera los `.svg`. Para cambiar un texto o mover una caja se edita ese archivo y se vuelve a ejecutar.

## Límites
- Las columnas de las tablas y los campos salen del esquema de datos y de las capturas (`../capturas/`); los **textos de ayuda y el orden son simplificados**, no una copia exacta.
- **Reporte (`09`):** solo vi las secciones 01–03 en la captura; los nombres de 04–06 los **deduje del subtítulo** («diagnóstico, vencimientos y pérdidas, residuos, capacitación y mejoras») y están marcados «según el subtítulo».
- **Diagnóstico (`07`):** dibujé solo la pestaña «Obligatorios»; las pestañas Madurez y Resultados no tienen wireframe propio.
- **Revisión visual:** vi `03` y `06` completos, y `07` a `17` en una hoja de contactos a baja resolución (corregí notas que se salían de su caja). **No inspeccioné `01`, `02`, `04` y `05` tras el último ajuste del generador.**
- Segregación (`05`) no figura en el menú lateral de la aplicación; no verifiqué cómo se llega a ella.
