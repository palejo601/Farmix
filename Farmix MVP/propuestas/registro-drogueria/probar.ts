import { calcularDigitoVerificacion as dv, esDigitoValido } from './dv-nit.js';
import { registroDrogueriaSchema as sch } from './registro-drogueria.schema.js';
const eq = (n: string, a: unknown, b: unknown) => { const ok = a === b; console.log(ok ? '✓' : '✗', n, ok ? '' : `esperado ${b}, obtuvo ${a}`); if (!ok) process.exitCode = 1; };
eq('DIAN 800197268', dv('800197268'), '4'); eq('Banco de Bogotá 860002964', dv('860002964'), '4'); eq('Bancolombia 890903938', dv('890.903.938'), '8');
eq('residuo 0/1 → mismo valor (NIT 1)', dv('1'), String((1*3)%11 > 1 ? 11 - (3 % 11) : 3 % 11)); eq('DV incorrecto', esDigitoValido('800197268', '5'), false);
let guion = false; try { dv('800197268-4'); } catch { guion = true; } eq('rechaza guion', guion, true);
const base = { organizacion_legal: { razon_social: 'Prueba SAS (simulada)', nombre_comercial: 'DROGUERIA Ejemplo', nit: '800197268', digito_verificacion: '4', tipo_persona: 'Persona Jurídica', matricula_mercantil: '12345', regimen_tributario: 'Responsable de IVA' },
 ubicacion_contacto: { direccion: 'Calle 1 # 2-3', municipio: 'Sincelejo', departamento: 'Sucre', codigo_postal: '700001', telefono_fijo: '2751234', celular: '3001234567', correo_notificaciones: 'prueba@ejemplo.test' },
 talento_humano: { representante_legal: { nombre_completo: 'Persona Ejemplo', tipo_documento: 'CC', numero_documento: '1000000' }, director_tecnico: { nombre_completo: 'Regente Ejemplo', tipo_documento: 'CC', numero_documento: '2000000', perfil_profesional: 'Tecnólogo en Regencia de Farmacia', tarjeta_profesional_rethus: 'RETHUS-0001' } },
 control_sanitario_operativo: { numero_radicado_secretaria: 'R-1', estado_concepto_sanitario: 'Favorable', fecha_ultima_inspeccion: '2026-01-15', area_local_m2: 25, ofrece_inyectologia: false, facturacion_electronica: { numero_resolucion: '18760000001', prefijo: 'FE', rango_inicial: 1, rango_final: 1000, fecha_vencimiento: '2027-01-15' } } };
const ok = sch.safeParse(base); eq('payload válido', ok.success, true); eq('CIIU por defecto', ok.success && ok.data.organizacion_legal.codigo_ciiu, '4773');
const mut = (f: (x: any) => void) => { const c = structuredClone(base); f(c); return sch.safeParse(c); };
eq('sin «Droguería»', mut((c) => (c.organizacion_legal.nombre_comercial = 'Farmacia Central')).success, false);
eq('«Drogueria» sin tilde', mut((c) => (c.organizacion_legal.nombre_comercial = 'Drogueria La Salud')).success, true);
eq('área 19,9', mut((c) => (c.control_sanitario_operativo.area_local_m2 = 19.9)).success, false);
eq('área 20', mut((c) => (c.control_sanitario_operativo.area_local_m2 = 20)).success, true);
eq('DV malo', mut((c) => (c.organizacion_legal.digito_verificacion = '9')).success, false);
eq('rango invertido', mut((c) => (c.control_sanitario_operativo.facturacion_electronica.rango_final = 0)).success, false);
eq('perfil fuera de lista', mut((c) => (c.talento_humano.director_tecnico.perfil_profesional = 'Expendedor de Drogas')).success, false);
