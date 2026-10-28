# Wireframes de baja fidelidad (Fase 2)

Dibujos simples, en grises, de las pantallas principales de FARMIX. Responden a «wireframes» de la Fase 2 de la propuesta.

> ⚠️ **Declaración de origen (para el informe):** estos wireframes se **reconstruyeron a partir del sistema ya construido** y de su esquema de datos; **no son diseños previos** al desarrollo. Sirven como documentación del diseño actual y para discutir mejoras con el director y los usuarios. Si la universidad exige wireframes anteriores al código, habría que presentarlos como «reconstruidos» o dibujar nuevos.

| Archivo | Pantalla | Req. |
|---|---|---|
| `01-ingreso-registro` | Ingreso, registro y recuperación | R6, R12 |
| `02-inicio` | Inicio: ciclo Registrar·Medir·Analizar·Mejorar, alertas e indicadores | R2, R5 |
| `03-vencimientos` | Lista, filtros, cifras y formulario de producto | R2, R3 |
| `04-residuos` | Gráfica, totales, lista y formulario de residuo | R1 |
| `05-segregacion` | Indicador, lista y formulario de verificación | R5 |
| `06-personal` | Trabajadores, capacitaciones y formulario | Propuesta F2 |

Cada uno existe como `.svg` (editable; se abre en el navegador, Figma, Inkscape o Canva) y como `.png` (para insertar en Word).
Las **notas amarillas** marcan reglas de negocio que la pantalla debe respetar (por ejemplo, «correctos no puede superar a revisados»).

## Cómo se hicieron y cómo cambiarlos
`python3 generar_wireframes.py` regenera los `.svg`. Para cambiar un texto o mover una caja se edita ese archivo y se vuelve a ejecutar.

## Límites
- **Faltan** las pantallas de diagnóstico y plan de mejora, reporte, normativa, importar, migrar, miembros, configuración y cuenta (están en `../capturas/`).
- Las columnas de las tablas y los campos de los formularios salen del esquema de datos y de las pantallas; los **textos de ayuda y el orden son simplificados**, no una copia exacta.
- Revisé a ojo `03-vencimientos` y `06-personal` (y corregí un desbordamiento en los formularios de cuatro columnas); no inspeccioné cada archivo restante después del último ajuste.
