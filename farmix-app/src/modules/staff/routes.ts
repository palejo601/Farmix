import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { guard } from '../drugstores/guard.js';
import * as s from './schema.js';
import * as service from './service.js';

export async function staffRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const db = app.db;
  const op = guard('operador');
  const adm = guard('administrador');
  const P = '/drugstores/:id';

  // Trabajadores
  r.get(`${P}/workers`, { onRequest: op, schema: { params: s.drugstoreParams, querystring: s.workerQuery, response: { 200: s.workerList } } }, async (req) =>
    service.listWorkers(db, req.membership!, req.query));
  r.post(`${P}/workers`, { onRequest: op, schema: { params: s.drugstoreParams, body: s.workerBody, response: { 201: s.workerResponse } } }, async (req, reply) =>
    reply.code(201).send({ item: await service.createWorker(db, req.membership!, req.auth!.user.id, req.body, req.id) }));
  r.get(`${P}/workers/:workerId`, { onRequest: op, schema: { params: s.workerParams, response: { 200: s.workerResponse } } }, async (req) => ({
    item: await service.getWorker(db, req.membership!, req.params.workerId) }));
  r.patch(`${P}/workers/:workerId`, { onRequest: op, schema: { params: s.workerParams, body: s.workerUpdate, response: { 200: s.workerResponse } } }, async (req) => ({
    item: await service.updateWorker(db, req.membership!, req.auth!.user.id, req.params.workerId, req.body, req.id) }));
  r.delete(`${P}/workers/:workerId`, { onRequest: adm, schema: { params: s.workerParams } }, async (req, reply) => {
    await service.removeWorker(db, req.membership!, req.auth!.user.id, req.params.workerId, req.id);
    return reply.code(204).send();
  });

  // Temas
  r.get(`${P}/training-topics`, { onRequest: op, schema: { params: s.drugstoreParams, response: { 200: s.topicList } } }, async (req) =>
    service.listTopics(db, req.membership!));
  r.post(`${P}/training-topics`, { onRequest: op, schema: { params: s.drugstoreParams, body: s.topicBody, response: { 201: s.topicResponse } } }, async (req, reply) =>
    reply.code(201).send({ item: await service.createTopic(db, req.membership!, req.auth!.user.id, req.body, req.id) }));

  // Capacitaciones
  r.get(`${P}/trainings`, { onRequest: op, schema: { params: s.drugstoreParams, querystring: s.trainingQuery, response: { 200: s.trainingList } } }, async (req) =>
    service.listTrainings(db, req.membership!, req.query));
  r.post(`${P}/trainings`, { onRequest: op, schema: { params: s.drugstoreParams, body: s.trainingBody, response: { 201: s.trainingResponse } } }, async (req, reply) =>
    reply.code(201).send({ item: await service.createTraining(db, req.membership!, req.auth!.user.id, req.body, req.id) }));
  r.patch(`${P}/trainings/:trainingId`, { onRequest: op, schema: { params: s.trainingParams, body: s.trainingUpdate, response: { 200: s.trainingResponse } } }, async (req) => ({
    item: await service.updateTraining(db, req.membership!, req.auth!.user.id, req.params.trainingId, req.body, req.id) }));
  r.delete(`${P}/trainings/:trainingId`, { onRequest: adm, schema: { params: s.trainingParams } }, async (req, reply) => {
    await service.removeTraining(db, req.membership!, req.auth!.user.id, req.params.trainingId, req.id);
    return reply.code(204).send();
  });
}
