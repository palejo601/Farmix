// Pruebas de las reglas de extracción (sin navegador):  node tests/extract.test.mjs
import { extractFields } from '../js/extract.js';
let bad = 0;
const t = (name, lines, expect) => {
  const r = extractFields(lines.map(x => ({ text: x, conf: 90, height: 20 })));
  const got = Object.fromEntries(r.fields.map(f => [f.field + (f.doubt ? '?' : ''), f.value]));
  const ok = Object.entries(expect).every(([k, v]) => v === null ? !(k in got) && !((k + '?') in got) : got[k] === v);
  if (!ok) bad++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + name + (ok ? '' : '  → ' + JSON.stringify(got)));
};
t('Lote, fabricación y vencimiento en un renglón', ['Lote: 23F118 Fab: 06/2023 Vence: 06/2025'], { lote: '23F118', fechaFabricacion: '06/2023', vencimiento: '06/2025' });
t('Tabla: encabezados arriba, valores abajo', ['LOTE  FAB  VENCE', '4B0123 05/2024 05/2027'], { lote: '4B0123', fechaFabricacion: '05/2024', vencimiento: '05/2027' });
t('Etiqueta y valor en renglones distintos', ['LOTE', '4B0123', 'F. FAB.', '05/2024', 'F. VENC.', '05/2027'], { lote: '4B0123', fechaFabricacion: '05/2024', vencimiento: '05/2027', nombre: null });
t('Inglés: MFG / EXP con año primero', ['L0TE 5K21A', 'MFG 2024-03', 'EXP 2027-03'], { lote: '5K21A', fechaFabricacion: '2024-03', vencimiento: '2027-03' });
t('Dos fechas sin etiqueta: se proponen como dudosas', ['AB123', '03/2024', '03/2027'], { 'fechaFabricacion?': '03/2024', 'vencimiento?': '03/2027', lote: null });
t('Fecha imposible: nunca se da por buena', ['LOTE: 4B0123', 'VENCE: 85/2027'], { 'vencimiento?': '85/2027', lote: '4B0123' });
t('«Fabricado por» no es fecha de fabricación', ['Fabricado por Tecnoquímicas S.A., Jamundí - Colombia', 'Lote 771 Vto 12/26'], { laboratorio: 'Tecnoquímicas S.A., Jamundí - Colombia', lote: '771', vencimiento: '12/26', fechaFabricacion: null });
t('Composición: principio activo y concentración', ['Cada tableta contiene Levotiroxina sódica 50 mcg', 'Reg. San. INVIMA 2023M-0012602-R2'], { principioActivo: 'Levotiroxina sódica', concentracion: '50 mcg', registroSanitario: 'INVIMA 2023M-0012602-R2', vencimiento: null });
t('No confunde «sódica 50» con una fecha', ['Levotiroxina sódica 50 mcg'], { vencimiento: null, 'vencimiento?': null });
t('Almacenamiento (no «fuera del alcance de los niños»)', ['Manténgase fuera del alcance de los niños', 'Almacenar a temperatura inferior a 30 °C, en su', 'envase y empaque original.'], { condiciones: 'Almacenar a temperatura inferior a 30 °C, en su envase y empaque original' });
t('Sin lote ni fecha: no inventa', ['CALMADOL', 'Tabletas recubiertas'], { lote: null, vencimiento: null, fechaFabricacion: null });
console.log(bad ? `\n${bad} fallo(s)` : '\nTodas las reglas correctas');
process.exit(bad ? 1 : 0);
