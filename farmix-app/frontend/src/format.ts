export const money = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
export const num = (n: number, d = 1) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d }).format(n);
export const kg = (n: number) => `${num(n, 1)} kg`;

/** YYYY-MM-DD → "27 oct 2026" (sin pasar por Date de zona horaria local, para no desfasar un día). */
export const date = (s?: string | null) => {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d)).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' });
};

export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

export const LABELS: Record<string, string> = {
  // vencimientos
  vigente: 'Vigente', proximo_a_vencer: 'Próximo a vencer', vencido: 'Vencido', gestionado: 'Gestionado',
  pendiente: 'Pendiente de gestión', devuelto_proveedor: 'Devuelto a proveedor',
  destruccion_gestor: 'Destrucción por gestor autorizado', averia_deterioro: 'Avería o deterioro',
  // residuos
  riesgo_biologico: 'Riesgo biológico', peligroso_quimico: 'Peligroso químico', aprovechable: 'Aprovechable',
  organico_aprovechable: 'Orgánico aprovechable', no_aprovechable: 'No aprovechable', medicamento_vencido: 'Medicamento vencido', otro: 'Otro',
  // mejoras
  en_curso: 'En curso', cerrada: 'Cerrada',
  // capacitación
  vencida: 'Vencida', sin_soporte: 'Sin soporte',
  // roles
  propietario: 'Propietario', administrador: 'Administrador', operador: 'Operador',
  // áreas de madurez
  residuos: 'Residuos', vencimientos: 'Vencimientos', segregacion: 'Segregación', personal_capacitacion: 'Personal y capacitación', documentacion: 'Documentación',
  vencimientos_perdidas: 'Vencimientos y pérdidas', capacitacion_documentos: 'Capacitación y documentos', seguimiento_mejora: 'Seguimiento y mejora',
  // importación / migración
  valida: 'Válida', invalida: 'Con errores', duplicada: 'Duplicada', confirmada: 'Confirmada', revertida: 'Revertida',
};
export const label = (k?: string | null) => (k ? LABELS[k] ?? k : '—');

/** Etiqueta del estado de una capacitación (el estado «vigente» es «Capacitado»: realizada, vigente y con soporte). */
export const TRAINING_LABEL: Record<string, string> = { vigente: 'Capacitado', sin_soporte: 'Sin soporte', vencida: 'Vencida', pendiente: 'Pendiente' };

export const TONE: Record<string, string> = {
  vigente: 'ok', proximo_a_vencer: 'warn', vencido: 'bad', gestionado: 'neutral',
  pendiente: 'neutral', en_curso: 'info', cerrada: 'ok', vencida: 'bad', sin_soporte: 'warn',
  valida: 'ok', invalida: 'bad', duplicada: 'warn', confirmada: 'ok', revertida: 'neutral',
};

// Clasificación según el manual de la Res. 591 de 2024 y el código de colores de la Res. 2184 de 2019 (mod. Res. 1344 de 2020).
export const CLASES = ['riesgo_biologico', 'peligroso_quimico', 'aprovechable', 'organico_aprovechable', 'no_aprovechable'] as const;
export const COLOR_CLASE: Record<string, string> = {
  riesgo_biologico: '#D1283F', peligroso_quimico: '#B7791F', aprovechable: '#FFFFFF', organico_aprovechable: '#1E9E4A', no_aprovechable: '#1F2328',
};
export const INFO_CLASE: Record<string, [string, string]> = {
  riesgo_biologico: ['Bolsa o recipiente rojo', 'Agujas y cortopunzantes (en guardián), guantes, algodones o gasas con fluidos'],
  peligroso_quimico: ['Sin bolsa de color: área de vencidos y entrega a gestor autorizado o programa posconsumo', 'Medicamentos vencidos o deteriorados, luminarias'],
  aprovechable: ['Bolsa blanca', 'Cartón, papel, plástico, vidrio y metales limpios y secos'],
  organico_aprovechable: ['Bolsa verde', 'Restos de comida'],
  no_aprovechable: ['Bolsa negra', 'Residuos de barrido, servilletas, empaques sucios'],
};
export const DESTINOS = ['pendiente', 'devuelto_proveedor', 'destruccion_gestor', 'averia_deterioro'] as const;

export const AVISO_LEGAL =
  'Autoevaluación orientativa. No es un concepto de cumplimiento ni reemplaza la visita de la Secretaría de Salud o de la autoridad ambiental. Criterios pendientes de validación por un profesional farmacéutico y un asesor jurídico.';
