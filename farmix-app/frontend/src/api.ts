export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: { campo: string; mensaje: string }[] = [],
    public requestId?: string,
  ) {
    super(message);
  }
  /** Mensaje legible, con el detalle por campo cuando la API lo da. */
  get full(): string {
    return this.details.length ? `${this.message}: ${this.details.map((d) => `${d.campo} (${d.mensaje})`).join('; ')}` : this.message;
  }
}

const BASE = '/api/v1';

async function parse(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path: string, init: RequestInit) {
  let res: Response;
  try {
    res = await fetch(BASE + path, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError(0, 'RED', 'No se pudo conectar con el servidor. ¿Está en ejecución el backend?');
  }
  const data = await parse(res);
  if (!res.ok) {
    const e = (data as any)?.error;
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('farmix:unauthorized'));
    throw new ApiError(res.status, e?.code ?? 'ERROR', e?.message ?? `Error ${res.status}`, e?.details ?? [], e?.requestId);
  }
  return data;
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: unknown) =>
    request(path, { method: 'POST', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: (path: string, body: unknown) => request(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: 'DELETE' }),
  upload: (path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request(path, { method: 'POST', body: form });
  },
};

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Trae todas las páginas de una colección paginada (limit/offset) y devuelve los ítems. */
export async function fetchAll(path: string, pageSize = 200, max = 2000): Promise<any[]> {
  const out: any[] = [];
  for (let offset = 0; offset < max; offset += pageSize) {
    const page = await api.get(`${path}${path.includes('?') ? '&' : '?'}limit=${pageSize}&offset=${offset}`);
    out.push(...page.items);
    if (out.length >= (page.total ?? out.length) || page.items.length === 0) break;
  }
  return out;
}
