export const money = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
export const num = (n: number, d = 1) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d }).format(n);

/** YYYY-MM-DD → DD/MM/AAAA (sin pasar por Date, para no desfasar por zona horaria). */
export const date = (s?: string | null) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');

export const todayISO = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  return p; // YYYY-MM-DD
};

export const LABELS: Record<string, string> = {
  // vencimientos
  vigente: 'Vigente', proximo_a_vencer: 'Próximo a vencer', vencido: 'Vencido', gestionado: 'Gestionado',
  pendiente: 'Pendiente', devolucion_proveedor: 'Devolución a proveedor', disposicion_final: 'Disposición final', otro: 'Otro',
  // residuos
  riesgo_biologico: 'Riesgo biológico', peligroso_quimico: 'Peligroso químico', aprovechable: 'Aprovechable',
  organico_aprovechable: 'Orgánico aprovechable', no_aprovechable: 'No aprovechable', medicamento_vencido: 'Medicamento vencido',
  // plan
  en_curso: 'En curso', cerrada: 'Cerrada', vencida: 'Vencida',
  // roles
  propietario: 'Propietario', administrador: 'Administrador', operador: 'Operador',
  // diagnóstico
  residuos: 'Residuos', vencimientos: 'Vencimientos', segregacion: 'Segregación', personal_capacitacion: 'Personal y capacitación', documentacion: 'Documentación',
};
export const label = (k?: string | null) => (k ? LABELS[k] ?? k : '—');

export const TONE: Record<string, string> = {
  vigente: 'ok', proximo_a_vencer: 'warn', vencido: 'bad', gestionado: 'muted',
  pendiente: 'warn', en_curso: 'info', cerrada: 'ok', vencida: 'bad',
  valida: 'ok', invalida: 'bad', duplicada: 'warn',
  confirmada: 'ok', revertida: 'muted',
};
