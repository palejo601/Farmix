import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { api, qs } from './api';
import { atLeast, useDrugstore } from './drugstore';
import { Alert, Empty, Modal, Spinner, errText, useToast } from './ui';

export interface Opt { value: string; label: string }
export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
  required?: boolean;
  /** Si queda vacío se envía null (para borrar el valor); si no, se omite. */
  nullable?: boolean;
  options?: Opt[];
  loadOptions?: () => Promise<Opt[]>;
  step?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  createOnly?: boolean;
  help?: string;
  placeholder?: string;
  default?: string;
  /** Solo se muestra cuando devuelve true (recibe los valores actuales del formulario). */
  showIf?: (v: Record<string, string>) => boolean;
}
export interface ColumnDef { header: string; cell: (row: any) => ReactNode; className?: string }
export interface FilterDef { name: string; label: string; options: Opt[] }

interface Props {
  title: string;
  singular: string;
  subtitle?: ReactNode;
  /** Ruta de la colección, p. ej. /drugstores/:id/expirations */
  base: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  filters?: FilterDef[];
  header?: ReactNode;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  /** Rol mínimo para crear/editar (por defecto operador). */
  onChanged?: () => void;
  /** Validación adicional antes de enviar; devuelve el mensaje de error o null. */
  validate?: (v: Record<string, string>) => string | null;
  emptyText?: string;
}

const PAGE = 100;

export function CrudPage(p: Props) {
  const { drugstore } = useDrugstore();
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<null | { row?: any }>(null);

  const load = useCallback(
    async (offset = 0, append = false) => {
      setLoading(true);
      try {
        const data = await api.get(p.base + qs({ ...filterValues, limit: PAGE, offset }));
        setRows((r) => (append ? [...r, ...data.items] : data.items));
        setTotal(data.total ?? data.items.length);
        setError('');
      } catch (e) {
        setError(errText(e));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.base, JSON.stringify(filterValues)],
  );
  useEffect(() => { void load(); }, [load]);

  const canDelete = (p.allowDelete ?? true) && atLeast(drugstore.role, 'administrador');
  const canEdit = p.allowEdit ?? true;
  const afterChange = () => { void load(); p.onChanged?.(); };

  async function remove(row: any) {
    if (!window.confirm(`¿Eliminar este ${p.singular}? Se archivará (borrado lógico).`)) return;
    try {
      await api.del(`${p.base}/${row.id}`);
      toast(`${p.singular[0]!.toUpperCase()}${p.singular.slice(1)} eliminado`);
      afterChange();
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{p.title}</h1>
          {p.subtitle && <p className="muted">{p.subtitle}</p>}
        </div>
        {(p.allowCreate ?? true) && <button className="primary" onClick={() => setModal({})}>+ Nuevo {p.singular}</button>}
      </div>
      {p.header}
      {p.filters && (
        <div className="filters">
          {p.filters.map((f) => (
            <label key={f.name}>
              {f.label}
              <select value={filterValues[f.name] ?? ''} onChange={(e) => setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                <option value="">Todos</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      {loading && rows.length === 0 ? (
        <Spinner />
      ) : rows.length === 0 && !error ? (
        <Empty>{p.emptyText ?? `Aún no hay ${p.title.toLowerCase()} registrados.`}</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {p.columns.map((c) => <th key={c.header}>{c.header}</th>)}
                {(canEdit || canDelete) && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {p.columns.map((c) => <td key={c.header} className={c.className}>{c.cell(r)}</td>)}
                  {(canEdit || canDelete) && (
                    <td className="actions">
                      {canEdit && <button className="link" onClick={() => setModal({ row: r })}>Editar</button>}
                      {canDelete && <button className="link danger" onClick={() => remove(r)}>Eliminar</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <p className="muted small">
          Mostrando {rows.length} de {total}.{' '}
          {rows.length < total && <button className="link" disabled={loading} onClick={() => load(rows.length, true)}>Cargar más</button>}
        </p>
      )}
      {modal && (
        <FormModal
          {...p}
          row={modal.row}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); toast('Guardado'); afterChange(); }}
        />
      )}
    </section>
  );
}

function initialValues(fields: FieldDef[], row?: any) {
  const v: Record<string, string> = {};
  for (const f of fields) {
    const raw = row?.[f.name];
    v[f.name] = raw === null || raw === undefined ? (row ? '' : f.default ?? '') : String(raw);
  }
  return v;
}

function FormModal(p: Props & { row?: any; onClose: () => void; onSaved: () => void }) {
  const { drugstore } = useDrugstore();
  const editing = !!p.row;
  const fields = useMemo(() => p.fields.filter((f) => !(editing && f.createOnly)), [p.fields, editing]);
  const [values, setValues] = useState(() => initialValues(p.fields, p.row));
  const [opts, setOpts] = useState<Record<string, Opt[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    for (const f of fields) if (f.loadOptions) f.loadOptions().then((o) => setOpts((s) => ({ ...s, [f.name]: o }))).catch((e) => setError(errText(e)));
  }, [fields]);

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));
  const visible = (f: FieldDef) => !f.showIf || f.showIf(values);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const msg = p.validate?.(values);
    if (msg) return setError(msg);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      if (!visible(f)) { if (editing && f.nullable) payload[f.name] = null; continue; }
      const raw = values[f.name] ?? '';
      if (raw === '') {
        if (f.nullable && (editing || f.name in (p.row ?? {}))) payload[f.name] = null;
        continue;
      }
      payload[f.name] = f.type === 'number' ? Number(raw) : raw;
    }
    setSaving(true);
    try {
      if (editing) await api.patch(`${p.base}/${p.row.id}`, payload);
      else await api.post(p.base, payload);
      p.onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setSaving(false);
    }
  }

  async function onFile(name: string, file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.upload(`/drugstores/${drugstore.id}/files`, file);
      set(name, res.file.id);
    } catch (err) {
      setError(errText(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title={`${editing ? 'Editar' : 'Nuevo'} ${p.singular}`} onClose={p.onClose}>
      <form onSubmit={submit} className="form">
        {error && <Alert>{error}</Alert>}
        {fields.filter(visible).map((f) => (
          <label key={f.name} className={f.type === 'textarea' ? 'full' : ''}>
            <span>{f.label}{f.required && <b aria-hidden> *</b>}</span>
            {f.type === 'select' ? (
              <select value={values[f.name]} required={f.required} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">{f.required ? 'Seleccione…' : '—'}</option>
                {(f.options ?? opts[f.name] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea value={values[f.name]} required={f.required} maxLength={f.maxLength} rows={3} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'file' ? (
              <div>
                <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => onFile(f.name, e.target.files?.[0])} />
                {uploading && <small className="muted">Subiendo…</small>}
                {values[f.name] && (
                  <small>
                    Soporte adjunto ·{' '}
                    <a href={`/api/v1/drugstores/${drugstore.id}/files/${values[f.name]}`} target="_blank" rel="noreferrer">descargar</a>
                    {' · '}<button type="button" className="link danger" onClick={() => set(f.name, '')}>quitar</button>
                  </small>
                )}
              </div>
            ) : (
              <input
                type={f.type}
                value={values[f.name]}
                required={f.required}
                step={f.step}
                min={f.min}
                max={f.max}
                maxLength={f.maxLength}
                placeholder={f.placeholder}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
            {f.help && <small className="muted">{f.help}</small>}
          </label>
        ))}
        <div className="form-actions full">
          <button type="button" onClick={p.onClose}>Cancelar</button>
          <button className="primary" disabled={saving || uploading}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
