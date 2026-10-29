// Dígito de verificación (DV) del NIT según el algoritmo módulo 11 de la DIAN.
// Pesos oficiales, aplicados de derecha a izquierda sobre los dígitos del NIT.
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/** Quita puntos y espacios (800.197.268 → 800197268). El DV va en su propio campo: un guion es un error. */
export function normalizarNit(nit: string): string {
  const limpio = nit.replace(/[.\s]/g, '');
  if (!/^\d{1,15}$/.test(limpio)) throw new RangeError('El NIT debe tener de 1 a 15 dígitos, sin guion ni dígito de verificación');
  return limpio;
}

export function calcularDigitoVerificacion(nit: string): string {
  const n = normalizarNit(nit);
  let suma = 0;
  for (let i = 0; i < n.length; i++) suma += Number(n[n.length - 1 - i]) * PESOS[i]!;
  const residuo = suma % 11;
  return String(residuo > 1 ? 11 - residuo : residuo);
}

export function esDigitoValido(nit: string, dv: string): boolean {
  try { return calcularDigitoVerificacion(nit) === dv.trim(); } catch { return false; }
}
