import { z } from 'zod';
import { esDigitoValido } from './dv-nit.js';

// Reglas por VERIFICAR contra la norma vigente antes de tratarlas como obligatorias (ver README).
export const AREA_MINIMA_M2 = 20;
export const PALABRA_OBLIGATORIA = 'drogueria';

/** Minúsculas y sin tildes: «Droguería», «DROGUERIA» y «drogueria» cuentan igual. */
const plano = (s: string) => s.normalize('NFD').replace(/\p{M}/g, '').toLowerCase();

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const fecha = z.iso.date(); // YYYY-MM-DD
const persona = {
  nombre_completo: texto(3, 120),
  tipo_documento: z.enum(['CC', 'CE', 'PA', 'PPT', 'PEP']), // lista propuesta; el JSON original no la define
  numero_documento: z.string().trim().regex(/^[A-Za-z0-9]{4,20}$/, 'Solo letras y números, de 4 a 20 caracteres'),
};

export const registroDrogueriaSchema = z.object({
  organizacion_legal: z.object({
    razon_social: texto(2, 160),
    nombre_comercial: texto(2, 120).refine((v) => plano(v).includes(PALABRA_OBLIGATORIA), 'El nombre comercial debe incluir la palabra «Droguería»'),
    nit: z.string().trim().regex(/^[\d.\s]{1,20}$/, 'Solo dígitos, sin guion ni dígito de verificación'),
    digito_verificacion: z.string().trim().regex(/^\d$/, 'Un solo dígito'),
    tipo_persona: z.enum(['Persona Natural', 'Persona Jurídica']),
    matricula_mercantil: texto(3, 30),
    codigo_ciiu: z.string().trim().regex(/^\d{4}$/, 'Cuatro dígitos').default('4773'),
    regimen_tributario: z.enum(['Responsable de IVA', 'No Responsable']),
  }).superRefine((o, ctx) => {
    if (!esDigitoValido(o.nit, o.digito_verificacion)) ctx.addIssue({ code: 'custom', path: ['digito_verificacion'], message: 'El dígito de verificación no corresponde al NIT' });
  }),
  ubicacion_contacto: z.object({
    direccion: texto(5, 160),
    municipio: texto(2, 80),
    departamento: texto(2, 80),
    codigo_postal: z.string().trim().regex(/^\d{6}$/, 'Seis dígitos'),
    telefono_fijo: z.string().trim().regex(/^\d{7,10}$/, 'De 7 a 10 dígitos'),
    celular: z.string().trim().regex(/^3\d{9}$/, 'Celular colombiano de 10 dígitos que empieza en 3'),
    correo_notificaciones: z.email().max(160),
  }),
  talento_humano: z.object({
    representante_legal: z.object(persona),
    director_tecnico: z.object({
      ...persona,
      perfil_profesional: z.enum(['Químico Farmacéutico', 'Tecnólogo en Regencia de Farmacia']),
      tarjeta_profesional_rethus: texto(3, 40),
    }),
  }),
  control_sanitario_operativo: z.object({
    numero_radicado_secretaria: texto(2, 60),
    estado_concepto_sanitario: texto(2, 60), // el JSON no define los valores posibles
    fecha_ultima_inspeccion: fecha,
    area_local_m2: z.number().min(AREA_MINIMA_M2, `El área del local debe ser de al menos ${AREA_MINIMA_M2} m²`).max(100000),
    ofrece_inyectologia: z.boolean(),
    facturacion_electronica: z.object({
      numero_resolucion: texto(3, 40),
      prefijo: z.string().trim().regex(/^[A-Za-z0-9]{0,4}$/, 'Hasta 4 letras o números'),
      rango_inicial: z.number().int().min(1),
      rango_final: z.number().int().min(1),
      fecha_vencimiento: fecha,
    }).refine((f) => f.rango_final >= f.rango_inicial, { path: ['rango_final'], message: 'El rango final no puede ser menor que el inicial' }),
  }),
});

export type RegistroDrogueria = z.infer<typeof registroDrogueriaSchema>;
