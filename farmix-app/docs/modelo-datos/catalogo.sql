-- Extrae del catálogo de PostgreSQL todo el modelo físico del esquema public, en un solo JSON.
-- Uso: psql "$DATABASE_URL" -At -f catalogo.sql > catalogo.json
select json_build_object(
 'tablas', (select json_agg(json_build_object(
    'tabla', c.relname,
    'columnas', (select json_agg(json_build_object(
        'columna', a.attname, 'tipo', format_type(a.atttypid, a.atttypmod), 'nulo', not a.attnotnull,
        'defecto', pg_get_expr(d.adbin, d.adrelid), 'identidad', a.attidentity <> '') order by a.attnum)
      from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
    'restricciones', (select json_agg(json_build_object(
        'nombre', k.conname, 'tipo', k.contype, 'definicion', pg_get_constraintdef(k.oid),
        'columnas', (select json_agg(att.attname order by u.ord) from unnest(k.conkey) with ordinality u(n, ord) join pg_attribute att on att.attrelid = k.conrelid and att.attnum = u.n),
        'destino', k.confrelid::regclass::text,
        'columnas_destino', (select json_agg(att.attname order by u.ord) from unnest(k.confkey) with ordinality u(n, ord) join pg_attribute att on att.attrelid = k.confrelid and att.attnum = u.n),
        'al_borrar', k.confdeltype, 'al_actualizar', k.confupdtype) order by k.contype, k.conname)
      from pg_constraint k where k.conrelid = c.oid),
    'indices', (select json_agg(json_build_object('nombre', i.indexname, 'definicion', i.indexdef) order by i.indexname)
      from pg_indexes i where i.schemaname = 'public' and i.tablename = c.relname)
  ) order by c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r')
);
