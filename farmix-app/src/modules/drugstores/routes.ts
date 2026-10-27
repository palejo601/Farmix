import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireAuth } from '../auth/plugin.js';
import { guard } from './guard.js';
import {
  addMemberBody, createBody, drugstoreListResponse, drugstoreResponse, idParams, memberListResponse,
  memberParams, memberResponse, updateBody, updateMemberBody,
} from './schema.js';
import * as service from './service.js';

export async function drugstoresRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const db = app.db;

  r.get('/drugstores', { onRequest: requireAuth, schema: { response: { 200: drugstoreListResponse } } }, async (req) => ({
    drugstores: await service.listForUser(db, req.auth!.user.id),
  }));

  r.post('/drugstores', { onRequest: requireAuth, schema: { body: createBody, response: { 201: drugstoreResponse } } }, async (req, reply) =>
    reply.code(201).send({ drugstore: await service.create(db, req.auth!.user.id, req.body, req.id) }),
  );

  r.get('/drugstores/:id', { onRequest: guard('operador'), schema: { params: idParams, response: { 200: drugstoreResponse } } }, async (req) => ({
    drugstore: service.toDrugstoreDto(req.membership!.drugstore, req.membership!.role),
  }));

  r.patch(
    '/drugstores/:id',
    { onRequest: guard('administrador'), schema: { params: idParams, body: updateBody, response: { 200: drugstoreResponse } } },
    async (req) => ({ drugstore: await service.update(db, req.membership!, req.auth!.user.id, req.body, req.id) }),
  );

  r.delete('/drugstores/:id', { onRequest: guard('propietario'), schema: { params: idParams } }, async (req, reply) => {
    await service.softDelete(db, req.membership!, req.auth!.user.id, req.id);
    return reply.code(204).send();
  });

  r.get('/drugstores/:id/members', { onRequest: guard('operador'), schema: { params: idParams, response: { 200: memberListResponse } } }, async (req) => ({
    members: await service.listMembers(db, req.params.id),
  }));

  r.post(
    '/drugstores/:id/members',
    { onRequest: guard('administrador'), schema: { params: idParams, body: addMemberBody, response: { 201: memberResponse } } },
    async (req, reply) =>
      reply.code(201).send({ member: await service.addMember(db, req.membership!, req.auth!.user.id, req.body, req.id) }),
  );

  r.patch(
    '/drugstores/:id/members/:userId',
    { onRequest: guard('administrador'), schema: { params: memberParams, body: updateMemberBody, response: { 200: memberResponse } } },
    async (req) => ({
      member: await service.changeMemberRole(db, req.membership!, req.auth!.user.id, req.params.userId, req.body.role, req.id),
    }),
  );

  // Cualquier miembro puede retirarse a sí mismo (salvo el propietario); retirar a otros exige rol.
  r.delete('/drugstores/:id/members/:userId', { onRequest: guard('operador'), schema: { params: memberParams } }, async (req, reply) => {
    await service.removeMember(db, req.membership!, req.auth!.user.id, req.params.userId, req.id);
    return reply.code(204).send();
  });
}
