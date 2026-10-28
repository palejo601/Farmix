#!/usr/bin/env python3
"""Genera la matriz de casos de prueba desde el informe JSON de Vitest.
Uso: python3 generar-matriz.py informe.json salida_dir
  (el informe se crea con: npx vitest run --reporter=json --outputFile=informe.json)"""
import csv, json, os, sys

REQ = {
 'waste': ('R1', 'Registrar residuos por clasificación'),
 'expirations': ('R2/R3', 'Vencimientos, alertas y pérdidas'),
 'reports': ('R4', 'Reporte de gestión'),
 'segregation': ('R5', 'Verificación de segregación'),
 'auth': ('R6', 'Cuentas y sesión'),
 'users-personal-data': ('R6/R12', 'Cuenta, privacidad y borrado de datos'),
 'drugstores': ('R7/R8/R9', 'Droguerías, roles y aislamiento'),
 'protected-routes': ('R9', 'Rutas privadas exigen sesión'),
 'diagnoses': ('O1', 'Diagnóstico'),
 'actions': ('O1b', 'Plan de mejora'),
 'staff': ('Propuesta F2', 'Personal y capacitaciones'),
 'files': ('Propuesta F2', 'Soportes documentales'),
 'imports': ('X2', 'Importar Excel/CSV'),
 'local-migrations': ('X3', 'Migrar datos locales'),
 'migrations': ('O3', 'Base de datos y migraciones'),
 'smoke': ('R1–R6', 'Flujo completo con servidor real'),
 'health': ('Infra', 'Estado del servicio'),
 'config': ('Infra', 'Configuración segura'),
 'cors': ('Infra', 'Orígenes permitidos'),
 'openapi': ('Infra', 'Documentación de la API'),
 'static': ('Infra', 'Entrega del frontend'),
}
inf, out = sys.argv[1], sys.argv[2]
d = json.load(open(inf, encoding='utf-8'))
rows = []
for f in sorted(d['testResults'], key=lambda x: x['name']):
    mod = os.path.basename(f['name']).replace('.test.ts', '')
    r, area = REQ.get(mod, ('—', mod))
    for t in f['assertionResults']:
        grupo = ' › '.join(t.get('ancestorTitles', []))
        rows.append([mod, r, area, grupo, t['title'], {'passed': 'Aprobó', 'failed': 'Falló'}.get(t['status'], t['status']), round(t.get('duration') or 0)])
os.makedirs(out, exist_ok=True)
with open(os.path.join(out, 'matriz-casos-de-prueba.csv'), 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh); w.writerow(['ID', 'Archivo', 'Requisito', 'Área', 'Grupo', 'Caso (qué se comprueba)', 'Resultado', 'ms']); [w.writerow([f'CP-{i+1:03d}'] + r) for i, r in enumerate(rows)]
tot = len(rows); ok = sum(r[5] == 'Aprobó' for r in rows)
res = {}
for r in rows: res.setdefault(r[0], [0, 0]); res[r[0]][0] += 1; res[r[0]][1] += r[5] == 'Aprobó'
with open(os.path.join(out, 'matriz-casos-de-prueba.md'), 'w', encoding='utf-8') as fh:
    fh.write(f'## Resumen por archivo\n\n| Archivo | Requisito | Casos | Aprobados |\n|---|---|---|---|\n')
    for m, (n, a) in res.items(): fh.write(f'| `{m}.test.ts` | {REQ.get(m, ("—",))[0]} | {n} | {a} |\n')
    fh.write(f'| **Total** | | **{tot}** | **{ok}** |\n\n## Casos\n\n| ID | Archivo | Req. | Grupo | Caso | Resultado |\n|---|---|---|---|---|---|\n')
    for i, r in enumerate(rows): fh.write(f'| CP-{i+1:03d} | `{r[0]}` | {r[1]} | {r[3].replace("|", "/")} | {r[4].replace("|", "/")} | {r[5]} |\n')
print(tot, ok)
