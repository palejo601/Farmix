import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeCtx, freshDb, makeApp, type Ctx } from './helpers.js';

let ctx: Ctx;
beforeAll(async () => {
  ctx = await makeApp();
  await freshDb(ctx.pool);
});
afterAll(() => closeCtx(ctx));

const ID = '11111111-1111-4111-8111-111111111111';

// Toda ruta protegida nueva debe agregarse aquí.
const PROTECTED: [string, string][] = [
  ['POST', '/auth/logout'],
  ['GET', '/auth/session'],
  ['POST', '/auth/change-password'],
  ['GET', '/users/me'],
  ['PATCH', '/users/me'],
  ['POST', '/users/me/privacy-acceptance'],
  ['GET', '/personal-data/export'],
  ['POST', '/personal-data/deletion-request'],
  ['DELETE', '/personal-data/deletion-request'],
  ['GET', '/drugstores'],
  ['POST', '/drugstores'],
  ['GET', `/drugstores/${ID}`],
  ['PATCH', `/drugstores/${ID}`],
  ['DELETE', `/drugstores/${ID}`],
  ['GET', `/drugstores/${ID}/members`],
  ['POST', `/drugstores/${ID}/members`],
  ['PATCH', `/drugstores/${ID}/members/${ID}`],
  ['DELETE', `/drugstores/${ID}/members/${ID}`],
  ['GET', `/drugstores/${ID}/expirations`],
  ['POST', `/drugstores/${ID}/expirations`],
  ['GET', `/drugstores/${ID}/expirations/alerts`],
  ['GET', `/drugstores/${ID}/expirations/losses`],
  ['GET', `/drugstores/${ID}/expirations/${ID}`],
  ['PATCH', `/drugstores/${ID}/expirations/${ID}`],
  ['DELETE', `/drugstores/${ID}/expirations/${ID}`],
  ['GET', `/drugstores/${ID}/waste-records`],
  ['POST', `/drugstores/${ID}/waste-records`],
  ['GET', `/drugstores/${ID}/waste-records/${ID}`],
  ['PATCH', `/drugstores/${ID}/waste-records/${ID}`],
  ['DELETE', `/drugstores/${ID}/waste-records/${ID}`],
  ['GET', `/drugstores/${ID}/segregation-checks`],
  ['POST', `/drugstores/${ID}/segregation-checks`],
  ['GET', `/drugstores/${ID}/segregation-checks/${ID}`],
  ['PATCH', `/drugstores/${ID}/segregation-checks/${ID}`],
  ['DELETE', `/drugstores/${ID}/segregation-checks/${ID}`],
  ['GET', `/drugstores/${ID}/workers`],
  ['POST', `/drugstores/${ID}/workers`],
  ['GET', `/drugstores/${ID}/workers/${ID}`],
  ['PATCH', `/drugstores/${ID}/workers/${ID}`],
  ['DELETE', `/drugstores/${ID}/workers/${ID}`],
  ['GET', `/drugstores/${ID}/training-topics`],
  ['POST', `/drugstores/${ID}/training-topics`],
  ['GET', `/drugstores/${ID}/trainings`],
  ['POST', `/drugstores/${ID}/trainings`],
  ['PATCH', `/drugstores/${ID}/trainings/${ID}`],
  ['DELETE', `/drugstores/${ID}/trainings/${ID}`],
  ['GET', `/drugstores/${ID}/improvement-actions`],
  ['POST', `/drugstores/${ID}/improvement-actions`],
  ['GET', `/drugstores/${ID}/improvement-actions/${ID}`],
  ['PATCH', `/drugstores/${ID}/improvement-actions/${ID}`],
  ['DELETE', `/drugstores/${ID}/improvement-actions/${ID}`],
  ['GET', `/drugstores/${ID}/diagnoses/instrument/current`],
  ['GET', `/drugstores/${ID}/diagnoses`],
  ['POST', `/drugstores/${ID}/diagnoses`],
  ['GET', `/drugstores/${ID}/diagnoses/${ID}`],
  ['PATCH', `/drugstores/${ID}/diagnoses/${ID}`],
  ['POST', `/drugstores/${ID}/files`],
  ['GET', `/drugstores/${ID}/files/${ID}`],
  ['DELETE', `/drugstores/${ID}/files/${ID}`],
  ['POST', `/drugstores/${ID}/imports/preview?kind=waste`],
  ['POST', `/drugstores/${ID}/imports/${ID}/confirm`],
  ['GET', `/drugstores/${ID}/imports/${ID}`],
  ['POST', '/local-migrations'],
  ['POST', `/local-migrations/${ID}/confirm`],
  ['POST', `/local-migrations/${ID}/revert`],
  ['GET', `/drugstores/${ID}/reports/management`],
];

describe('rutas protegidas sin sesión', () => {
  it.each(PROTECTED)('%s %s responde 401', async (method, url) => {
    const res = await ctx.app.inject({ method: method as 'GET', url: `/api/v1${url}` });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });
});
