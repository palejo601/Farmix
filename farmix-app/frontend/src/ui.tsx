import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError } from './api';
import { TONE, label } from './format';

export const Badge = ({ value, text }: { value: string; text?: string }) => <span className={`badge ${TONE[value] ?? 'muted'}`}>{text ?? label(value)}</span>;

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'info' | 'ok' | 'warn'; children: ReactNode }) {
  return <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export const errText = (e: unknown) => (e instanceof ApiError ? e.full : e instanceof Error ? e.message : 'Error inesperado');

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="icon" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

export function Spinner({ text = 'Cargando…' }: { text?: string }) {
  return <p className="muted" role="status">{text}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

// ---- Avisos efímeros ----
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'error') => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const push = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, msg, kind }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    fn().then((d) => live && (setData(d), setError(''))).catch((e) => live && setError(errText(e))).finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

export function Bar({ value, max = 100, tone = 'ok' }: { value: number; max?: number; tone?: string }) {
  return (
    <div className="bar" role="img" aria-label={`${value} de ${max}`}>
      <div className={`bar-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}
