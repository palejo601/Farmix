// Perfil de rendimiento: en teléfonos con poca memoria o pocos núcleos se usa menos resolución y se omiten las lecturas
// más pesadas. Se detecta solo y se puede forzar en Configuración («auto», «rapido» o «completo»).
let mode = 'auto';
try { mode = localStorage.getItem('perfMode') || 'auto'; } catch { /* sin almacenamiento: automático */ }
const mem = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 0;
// La memoria es la mejor señal cuando el navegador la informa (Android); si no (iPhone), se usa el número de núcleos.
export const DETECTED_LOW = mem > 0 ? mem <= 4 || (cores > 0 && cores <= 2) : (cores > 0 && cores <= 4);
export const LOW = mode === 'rapido' ? true : mode === 'completo' ? false : DETECTED_LOW;
export function setPerfMode(m) { try { localStorage.setItem('perfMode', m); } catch { /* sin almacenamiento */ } }
export const perfMode = () => mode;
export const deviceInfo = () => `${mem ? mem + ' GB de memoria' : 'memoria no informada'} · ${cores || '?'} núcleos`;
