'use strict';
// Maqueta conectada a la API real (/api/v1). Mismo origen, sesión por cookie. Las reglas las aplica el servidor.
const API = '/api/v1';
const root = document.getElementById('root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('es-CO');
const money = (n) => '$ ' + fmt(n);
// El servidor valida las fechas con la hora de Bogotá; se usa la misma para no enviar «fechas futuras».
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const CLASES = { riesgo_biologico: 'Riesgo biológico', peligroso_quimico: 'Peligroso (químico/fármaco)', aprovechable: 'Aprovechable', organico_aprovechable: 'Orgánico aprovechable', no_aprovechable: 'No aprovechable' };
const DESTINOS = { pendiente: 'Pendiente', devuelto_proveedor: 'Devuelto al proveedor', destruccion_gestor: 'Destrucción por gestor', averia_deterioro: 'Avería o deterioro' };
const ESTADO_PROD = { vigente: ['Vigente', 'ok'], proximo_a_vencer: ['Por vencer', 'warn'], vencido: ['Vencido', 'bad'], gestionado: ['Gestionado', 'neutral'] };
const ESTADO_CAP = { vigente: ['Vigente', 'ok'], pendiente: ['Pendiente', 'warn'], vencida: ['Vencida', 'bad'], sin_soporte: ['Sin soporte', 'warn'] };
const ESTADO_MEJ = { pendiente: ['Pendiente', 'bad'], en_curso: ['En curso', 'warn'], cerrada: ['Cerrada', 'ok'] };
const SIGUIENTE = { pendiente: 'en_curso', en_curso: 'cerrada' };
const VISTAS = { inicio: 'Inicio', residuos: 'Residuos', vencimientos: 'Vencimientos', segregacion: 'Segregación', personal: 'Personal', diagnostico: 'Diagnóstico' };

const S = { user: null, tiendas: [], id: null };
try { S.id = localStorage.getItem('maqueta.drugstore'); } catch { /* sin almacenamiento */ }

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { /* no JSON */ }
  if (!res.ok) {
    const e = data?.error;
    const det = e?.details?.length ? ' (' + e.details.map((d) => `${d.campo}: ${d.mensaje}`).join('; ') + ')' : '';
    const err = new Error((e?.message ?? `Error ${res.status}`) + det);
    err.status = res.status;
    throw err;
  }
  return data;
}
const base = () => `/drugstores/${S.id}`;
const msg = (id, t, ok) => { const e = document.getElementById(id); if (e) { e.textContent = t; e.className = 'msg ' + (ok ? 'ok' : 'err'); } };
const pill = (par) => `<span class="pill ${par[1]}">${esc(par[0])}</span>`;
const pct = (k, r) => (r ? Math.round((100 * k) / r) : 0);
const vista = () => { const h = location.hash.slice(1); return VISTAS[h] ? h : 'inicio'; };

/* ───────── Ingreso ───────── */
function pantallaLogin(aviso) {
  root.innerHTML = `<div class="login card"><div class="brand">FARMIX<small>Maqueta conectada</small></div>
    <form id="fl"><label>Correo<input id="le" type="email" required autocomplete="username"></label>
    <label>Contraseña<input id="lp" type="password" required autocomplete="current-password"></label>
    <button class="btn" type="submit">Ingresar</button><div class="msg ${aviso ? 'err' : ''}" id="lm">${esc(aviso || '')}</div></form>
    <p class="note">Usa la cuenta de demostración que imprime <span class="mono">datos-demo.sh</span>. No uses datos reales.</p></div>`;
  document.getElementById('fl').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('POST', '/auth/login', { email: document.getElementById('le').value, password: document.getElementById('lp').value });
      await arrancar();
    } catch (er) { msg('lm', er.message); }
  };
}

/* ───────── Marco ───────── */
function marco(v, cuerpo) {
  const nav = Object.entries(VISTAS).map(([k, t]) => `<a href="#${k}" ${k === v ? 'aria-current="page"' : ''}>${t}</a>`).join('');
  const sel = S.tiendas.map((t) => `<option value="${t.id}" ${t.id === S.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  root.innerHTML = `<div class="app"><aside class="side"><div class="brand">FARMIX<small>${esc(S.user.fullName)}</small></div>
    <label>Droguería<select id="ds">${sel}</select></label><nav aria-label="Secciones">${nav}</nav>
    <button class="btn link" id="out">Cerrar sesión</button></aside><main id="main">${cuerpo}</main></div>`;
  document.getElementById('ds').onchange = (e) => { S.id = e.target.value; try { localStorage.setItem('maqueta.drugstore', S.id); } catch { /* ok */ } mostrar(); };
  document.getElementById('out').onclick = async () => { try { await api('POST', '/auth/logout'); } catch { /* ok */ } S.user = null; pantallaLogin(); };
}

/* ───────── Vistas ───────── */
const V = {};

V.inicio = async () => {
  const [al, wr, sg, tr, dg, ac] = await Promise.all([
    api('GET', base() + '/expirations/alerts'), api('GET', base() + '/waste-records?limit=200'),
    api('GET', base() + '/segregation-checks'), api('GET', base() + '/trainings?limit=200'),
    api('GET', base() + '/diagnoses?limit=1'), api('GET', base() + '/improvement-actions?limit=200'),
  ]);
  const kg = wr.items.filter((r) => r.unit === 'kg').reduce((a, r) => a + r.quantity, 0);
  const otras = wr.items.filter((r) => r.unit !== 'kg').length;
  const r = sg.resumen;
  const vig = tr.items.filter((t) => t.status === 'vigente').length;
  const d = dg.items[0];
  const abiertas = ac.items.filter((a) => a.state !== 'cerrada').length;
  return `<div><h1>Inicio</h1><p class="sub">Registrar · Medir · Analizar · Mejorar</p></div>
  <div class="cycle"><a href="#residuos">Registrar<small>Residuos y vencimientos</small></a><a href="#segregacion">Medir<small>Segregación y capacitación</small></a><a href="#diagnostico">Analizar<small>Diagnóstico</small></a><a href="#diagnostico">Mejorar<small>Plan de mejora</small></a></div>
  <div class="grid">
   <div class="kpi"><b>${fmt(Math.round(kg * 10) / 10)} kg</b><span>Residuos en kg${otras ? ` · ${otras} registros en otras unidades, aparte` : ''}</span></div>
   <div class="kpi"><b>${al.summary.vencidos + al.summary.proximos}</b><span>${al.summary.vencidos} vencidos · ${al.summary.proximos} por vencer</span></div>
   <div class="kpi"><b>${r.porcentajeCorrecto == null ? '—' : Math.round(r.porcentajeCorrecto) + ' %'}</b><span>Segregación correcta (${r.bienSegregados} de ${r.revisados})</span></div>
   <div class="kpi"><b>${vig} de ${tr.total}</b><span>Capacitaciones vigentes con soporte</span></div>
   <div class="kpi"><b>${d ? d.obligatorios.cumple + ' de ' + d.obligatorios.aplicables : '—'}</b><span>Obligatorios que cumple${d ? '' : ' (sin diagnóstico)'}</span></div>
   <div class="kpi"><b>${abiertas}</b><span>Mejoras abiertas</span></div></div>
  <section class="card"><h2>Alertas de vencimiento</h2>${al.items.length ? al.items.map((p) => `<div class="alert"><span>${esc(p.productName)} · lote <span class="mono">${esc(p.batch)}</span></span><span>${p.daysLeft < 0 ? 'Vencido hace ' + -p.daysLeft + ' días' : 'Vence en ' + p.daysLeft + ' días'}</span></div>`).join('') : '<p class="note">Sin alertas.</p>'}
  <a href="#vencimientos">Ver vencimientos</a></section>`;
};

V.residuos = async () => {
  const wr = await api('GET', base() + '/waste-records?limit=200');
  const por = {};
  wr.items.filter((r) => r.unit === 'kg').forEach((r) => { por[r.classification] = (por[r.classification] || 0) + r.quantity; });
  const max = Math.max(...Object.values(por), 1);
  const otras = wr.items.filter((r) => r.unit !== 'kg');
  return `<div><h1>Residuos</h1><p class="sub">Registro por clasificación · ${wr.total} registros</p></div>
  <section class="card"><h2>Nuevo registro</h2><form id="fr">
   <label>Fecha<input id="rd" type="date" value="${hoy()}" required></label>
   <label>Clasificación<select id="rc">${Object.entries(CLASES).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
   <label>Cantidad<input id="rq" type="number" min="0.001" step="0.001" value="1" required></label>
   <label>Unidad<select id="ru"><option>kg</option><option>g</option><option>unidades</option></select></label>
   <label>Tipo (opcional)<input id="rt" maxlength="120"></label>
   <label>¿Medicamento vencido?<select id="ro"><option value="">No</option><option value="medicamento_vencido">Sí</option></select></label>
   <button class="btn" type="submit">Guardar</button><div class="msg" id="rm"></div></form>
   <p class="note">Prueba esto: «Sí» con «Riesgo biológico». Lo rechaza el servidor.</p></section>
  <section class="card"><h2>Total por clasificación (kg)</h2>${Object.entries(por).map(([c, q]) => `<div class="bar"><span>${esc(CLASES[c])}</span><i style="width:${(q / max) * 100}%"></i><span class="mono">${Math.round(q * 10) / 10} kg</span></div>`).join('') || '<p class="note">Sin registros en kg.</p>'}
   ${otras.length ? `<p class="note">Registros en otras unidades (no se suman a los kg): ${otras.length}.</p>` : ''}</section>
  <section class="card"><h2>Registros</h2><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Clasificación</th><th>Tipo</th><th class="n">Cantidad</th></tr></thead><tbody>
   ${wr.items.map((r) => `<tr><td class="mono">${r.recordedOn}</td><td>${esc(CLASES[r.classification])}${r.origin === 'medicamento_vencido' ? ' <span class="pill warn">vencido</span>' : ''}</td><td>${esc(r.wasteType ?? '')}</td><td class="n">${r.quantity} ${r.unit}</td></tr>`).join('')}</tbody></table></div></section>`;
};

V.vencimientos = async () => {
  const [ls, ls2] = await Promise.all([api('GET', base() + '/expirations?limit=200'), api('GET', base() + '/expirations/losses')]);
  const f = (b) => `${money(b.valor)} · ${b.productos} productos`;
  return `<div><h1>Vencimientos</h1><p class="sub">${ls.total} productos · alerta a ${ls2.anticipacionDias} días</p></div>
  <section class="card"><h2>Nuevo producto</h2><form id="fv">
   <label>Producto<input id="vn" required></label><label>Lote<input id="vl" required></label>
   <label>Vence<input id="vf" type="date" required></label><label>Cantidad<input id="vq" type="number" min="1" value="10" required></label>
   <label>Costo unitario<input id="vc" type="number" min="0" step="0.01" value="500"></label>
   <button class="btn" type="submit">Guardar</button><div class="msg" id="vm"></div></form>
   <p class="note">Prueba esto: guarda un lote que ya exista, para ver el rechazo del servidor.</p></section>
  <section class="card"><h2>Productos</h2><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Lote</th><th>Vence</th><th class="n">Cant.</th><th>Estado</th><th>Gestionar</th></tr></thead><tbody>
   ${ls.items.map((p) => `<tr><td>${esc(p.productName)}</td><td class="mono">${esc(p.batch)}</td><td class="mono">${p.expiresOn}</td><td class="n">${p.quantity}</td>
    <td>${pill(ESTADO_PROD[p.status])}${p.status === 'gestionado' ? ' ' + esc(DESTINOS[p.destination]) : ''}</td>
    <td>${p.destination === 'pendiente' ? ['devuelto_proveedor|Devolver', 'destruccion_gestor|Destruir', 'averia_deterioro|Avería'].map((x) => { const [k, t] = x.split('|'); return `<button class="btn ghost" data-g="${p.id}|${k}">${t}</button>`; }).join(' ') : ''}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>Pérdidas (descriptivo)</h2>
   <p style="margin:0">Pérdida confirmada: <b class="mono">${f(ls2.perdidaConfirmada)}</b></p>
   <p style="margin:0">Valor en riesgo: <b class="mono">${f(ls2.valorEnRiesgo)}</b></p>
   <p style="margin:0">Devuelto al proveedor: <b class="mono">${f(ls2.devueltoProveedor)}</b></p><p class="note">${esc(ls2.aviso)}</p></section>`;
};

V.segregacion = async () => {
  const sg = await api('GET', base() + '/segregation-checks?limit=200');
  const r = sg.resumen;
  return `<div><h1>Segregación</h1><p class="sub">Verificación de la separación en la fuente</p></div>
  <section class="card"><h2>Nueva verificación</h2><form id="fs">
   <label>Fecha<input id="sd" type="date" value="${hoy()}" required></label><label>Lugar<input id="sl" value="Bodega" required></label>
   <label>Revisados<input id="sr" type="number" min="1" value="10" required></label><label>Bien segregados<input id="sk" type="number" min="0" value="8" required></label>
   <button class="btn" type="submit">Guardar</button><div class="msg" id="sm"></div></form>
   <p class="note">Prueba esto: más bien segregados que revisados.</p></section>
  <section class="card"><h2>Resultado global: ${r.porcentajeCorrecto == null ? '—' : Math.round(r.porcentajeCorrecto) + ' %'}</h2><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Lugar</th><th class="n">Revisados</th><th class="n">Correctos</th><th class="n">%</th></tr></thead><tbody>
   ${sg.items.map((s) => `<tr><td class="mono">${s.checkedOn}</td><td>${esc(s.location)}</td><td class="n">${s.itemsReviewed}</td><td class="n">${s.itemsCorrect}</td><td class="n">${Math.round(s.percentCorrect)} %</td></tr>`).join('')}</tbody></table></div></section>`;
};

V.personal = async () => {
  const [w, t, c] = await Promise.all([api('GET', base() + '/workers?limit=200'), api('GET', base() + '/training-topics'), api('GET', base() + '/trainings?limit=200')]);
  return `<div><h1>Personal</h1><p class="sub">${w.total} trabajadores · ${c.total} capacitaciones</p></div>
  <section class="card"><h2>Nuevo trabajador</h2><form id="fw">
   <label>Código<input id="wc" required maxlength="30"></label><label>Nombre<input id="wn" required minlength="2"></label><label>Cargo<input id="wj"></label>
   <button class="btn" type="submit">Guardar</button><div class="msg" id="wm"></div></form></section>
  <section class="card"><h2>Registrar capacitación</h2>${w.items.length ? `<form id="fp">
   <label>Trabajador<select id="pw">${w.items.map((x) => `<option value="${x.id}">${esc(x.fullName)}</option>`).join('')}</select></label>
   <label>Tema<select id="pt">${t.items.map((x) => `<option value="${x.id}">${esc(x.topicName)}</option>`).join('')}</select></label>
   <label>Fecha realizada<input id="pf" type="date" value="${hoy()}"></label>
   <button class="btn" type="submit">Guardar</button><div class="msg" id="pm"></div></form>
   <p class="note">Esta maqueta no sube el soporte (PDF o imagen): sin soporte, el estado será «Sin soporte».</p>` : '<p class="note">Agrega primero un trabajador.</p>'}</section>
  <section class="card"><h2>Capacitaciones</h2><div class="tablewrap"><table><thead><tr><th>Trabajador</th><th>Tema</th><th>Realizada</th><th>Vigente hasta</th><th>Estado</th></tr></thead><tbody>
   ${c.items.map((x) => `<tr><td>${esc(x.workerName)}</td><td>${esc(x.topicName)}</td><td class="mono">${x.trainedOn ?? '—'}</td><td class="mono">${x.validUntil ?? '—'}</td><td>${pill(ESTADO_CAP[x.status])}</td></tr>`).join('')}</tbody></table></div></section>`;
};

let DIAG = null;
V.diagnostico = async () => {
  const [ins, dg, ac] = await Promise.all([api('GET', base() + '/diagnoses/instrument/current'), api('GET', base() + '/diagnoses?limit=1'), api('GET', base() + '/improvement-actions?limit=200')]);
  const det = dg.items[0] ? (await api('GET', `${base()}/diagnoses/${dg.items[0].id}`)).item : null;
  const resp = Object.fromEntries((det?.answers ?? []).filter((a) => a.kind === 'obligatorio').map((a) => [a.itemId, a.response]));
  DIAG = { id: det?.id ?? null, ins: ins.instrument, ac: ac.items };
  const abierta = (itemId) => ac.items.some((a) => a.originItemId === itemId && a.state !== 'cerrada');
  const nc = det?.obligatorios.noCumple ?? [];
  return `<div><h1>Diagnóstico</h1><p class="sub">${esc(ins.instrument.title)} · ${det ? `${det.obligatorios.cumple} de ${det.obligatorios.aplicables} cumplen` : 'sin diagnóstico'}</p></div>
  <section class="card"><h2>Requisitos obligatorios</h2><p class="note">${esc(ins.instrument.aviso)}</p><form id="fd">
   ${ins.instrument.obligatorios.map((o) => `<div class="req"><div><span class="mono">${esc(o.code)}</span> ${esc(o.prompt)}</div>
    <fieldset aria-label="${esc(o.code)}">${[['si', 'Cumple'], ['no', 'No cumple'], ['na', 'No aplica']].map(([v, l]) => `<label><input type="radio" name="${o.id}" value="${v}" ${resp[o.id] === v ? 'checked' : ''}>${l}</label>`).join('')}</fieldset></div>`).join('')}
   <div style="display:flex;gap:12px;align-items:center;margin-top:12px"><button class="btn" type="submit">Guardar diagnóstico</button><div class="msg" id="dm"></div></div></form></section>
  <section class="card"><h2>Incumplimientos y plan de mejora</h2>
   ${nc.length ? nc.map((o) => `<div class="req"><div><span class="mono">${esc(o.code)}</span> ${esc(o.prompt)}</div>${abierta(o.itemId) ? '<span class="pill neutral">Con mejora</span>' : `<button class="btn ghost" data-mj="${o.itemId}">Crear mejora</button>`}</div>`).join('') : '<p class="note">Sin incumplimientos registrados.</p>'}
   ${ac.items.length ? `<div class="tablewrap"><table><thead><tr><th>Hallazgo</th><th>Estado</th><th></th></tr></thead><tbody>${ac.items.map((a) => `<tr><td style="white-space:normal">${esc(a.finding)}</td><td>${pill(ESTADO_MEJ[a.state])}</td><td>${SIGUIENTE[a.state] ? `<button class="btn ghost" data-av="${a.id}|${SIGUIENTE[a.state]}">Avanzar</button>` : ''}</td></tr>`).join('')}</tbody></table></div><p class="msg" id="mm"></p>` : ''}</section>`;
};

/* ───────── Acciones por vista ───────── */
const A = {};
const $ = (id) => document.getElementById(id);
A.residuos = () => {
  $('fr').onsubmit = (e) => guardar(e, 'rm', () => api('POST', base() + '/waste-records', {
    recordedOn: $('rd').value, classification: $('rc').value, quantity: parseFloat($('rq').value), unit: $('ru').value,
    ...($('rt').value.trim() ? { wasteType: $('rt').value.trim() } : {}), ...($('ro').value ? { origin: $('ro').value } : {}),
  }), 'Registro guardado.');
};
A.vencimientos = () => {
  $('fv').onsubmit = (e) => guardar(e, 'vm', () => api('POST', base() + '/expirations', {
    productName: $('vn').value.trim(), batch: $('vl').value.trim(), expiresOn: $('vf').value, quantity: parseInt($('vq').value, 10), unitCost: parseFloat($('vc').value || '0'),
  }), 'Producto guardado.');
  document.querySelectorAll('[data-g]').forEach((b) => { b.onclick = async () => {
    const [id, destination] = b.dataset.g.split('|');
    try { await api('PATCH', `${base()}/expirations/${id}`, { destination }); mostrar(); } catch (er) { alert2(er.message); }
  }; });
};
A.segregacion = () => {
  $('fs').onsubmit = (e) => guardar(e, 'sm', () => api('POST', base() + '/segregation-checks', {
    checkedOn: $('sd').value, location: $('sl').value.trim(), itemsReviewed: parseInt($('sr').value, 10), itemsCorrect: parseInt($('sk').value, 10),
  }), 'Verificación guardada.');
};
A.personal = () => {
  $('fw').onsubmit = (e) => guardar(e, 'wm', () => api('POST', base() + '/workers', { workerCode: $('wc').value.trim(), fullName: $('wn').value.trim(), ...($('wj').value.trim() ? { jobTitle: $('wj').value.trim() } : {}) }), 'Trabajador guardado.');
  if ($('fp')) $('fp').onsubmit = (e) => guardar(e, 'pm', () => api('POST', base() + '/trainings', { workerId: $('pw').value, topicId: $('pt').value, ...($('pf').value ? { trainedOn: $('pf').value } : {}) }), 'Capacitación guardada.');
};
A.diagnostico = () => {
  $('fd').onsubmit = async (e) => {
    e.preventDefault();
    const answers = DIAG.ins.obligatorios.map((o) => { const r = document.querySelector(`input[name="${o.id}"]:checked`); return r ? { itemId: o.id, response: r.value } : null; }).filter(Boolean);
    try {
      if (DIAG.id) await api('PATCH', `${base()}/diagnoses/${DIAG.id}`, { answers });
      else await api('POST', base() + '/diagnoses', { performedOn: hoy(), answers });
      await mostrar('Diagnóstico guardado.', 'dm');
    } catch (er) { msg('dm', er.message); }
  };
  document.querySelectorAll('[data-mj]').forEach((b) => { b.onclick = async () => {
    const o = DIAG.ins.obligatorios.find((x) => x.id === b.dataset.mj);
    try { await api('POST', base() + '/improvement-actions', { finding: `Incumplimiento: ${o.prompt.replace(/^¿/, '').replace(/\?$/, '')}`, originItemId: o.id }); mostrar(); } catch (er) { alert2(er.message); }
  }; });
  document.querySelectorAll('[data-av]').forEach((b) => { b.onclick = async () => {
    const [id, state] = b.dataset.av.split('|');
    try { await api('PATCH', `${base()}/improvement-actions/${id}`, { state, ...(state === 'cerrada' ? { closedOn: hoy() } : {}) }); mostrar(); } catch (er) { alert2(er.message); }
  }; });
};
function alert2(t) { const m = $('mm') || document.querySelector('.msg'); if (m) { m.textContent = t; m.className = 'msg err'; } else window.alert(t); }
async function guardar(e, id, fn, ok) {
  e.preventDefault();
  try { await fn(); await mostrar(ok, id); } catch (er) { msg(id, er.message); }
}

/* ───────── Arranque ───────── */
async function mostrar(aviso, msgId) {
  const v = vista();
  try {
    const cuerpo = await V[v]();
    marco(v, cuerpo);
    if (A[v]) A[v]();
    if (aviso && msgId) msg(msgId, aviso, true);
  } catch (er) {
    if (er.status === 401) { S.user = null; return pantallaLogin('Tu sesión terminó. Ingresa de nuevo.'); }
    marco(v, `<section class="card"><h2>No se pudo cargar</h2><p class="msg err">${esc(er.message)}</p></section>`);
  }
}
async function arrancar() {
  const s = await api('GET', '/auth/session');
  S.user = s.user;
  const d = await api('GET', '/drugstores');
  S.tiendas = d.drugstores;
  if (!S.tiendas.length) {
    root.innerHTML = '<div class="login card"><h2>Sin droguerías</h2><p class="note">Esta cuenta no tiene droguerías. Carga la demostración con <span class="mono">datos-demo.sh</span> o créala en la aplicación principal.</p></div>';
    return;
  }
  if (!S.tiendas.some((t) => t.id === S.id)) S.id = S.tiendas[0].id;
  await mostrar();
}
addEventListener('hashchange', () => { if (S.user && S.id) mostrar(); });
arrancar().catch(() => pantallaLogin());
