import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { drugstoreMembers as members, drugstores, users } from '../../db/schema.js';
import { audit } from '../../shared/audit.js';
import { AppError } from '../../shared/errors.js';
import type { Membership } from './guard.js';
import { ROLE_RANK, type Role } from './schema.js';

type DrugstoreRow = typeof drugstores.$inferSelect;

export function toDrugstoreDto(d: DrugstoreRow, role: Role) {
  return {
    id: d.id,
    name: d.name,
    city: d.city,
    expiryAlertDays: d.expiryAlertDays,
    role,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function listForUser(db: Db, userId: string) {
  const rows = await db
    .select({ d: drugstores, role: members.memberRole })
    .from(members)
    .innerJoin(drugstores, eq(drugstores.id, members.drugstoreId))
    .where(and(eq(members.userId, userId), isNull(members.deletedAt), isNull(drugstores.deletedAt)))
    .orderBy(drugstores.name);
  return rows.map((r) => toDrugstoreDto(r.d, r.role));
}

export async function create(db: Db, userId: string, input: { name: string; city?: string; expiryAlertDays?: number }, requestId: string) {
  const d = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(drugstores)
      .values({ name: input.name, city: input.city, expiryAlertDays: input.expiryAlertDays, createdBy: userId, updatedBy: userId })
      .returning();
    await tx.insert(members).values({ drugstoreId: row!.id, userId, memberRole: 'propietario', createdBy: userId, updatedBy: userId });
    return row!;
  });
  await audit(db, { userId, action: 'drugstores.create', resource: 'drugstores', resourceId: d.id, outcome: 'success', requestId });
  return toDrugstoreDto(d, 'propietario');
}

export async function update(db: Db, m: Membership, userId: string, patch: { name?: string; city?: string; expiryAlertDays?: number }, requestId: string) {
  const [row] = await db
    .update(drugstores)
    .set({ ...patch, updatedBy: userId, updatedAt: new Date() })
    .where(and(eq(drugstores.id, m.drugstore.id), isNull(drugstores.deletedAt)))
    .returning();
  await audit(db, { userId, action: 'drugstores.update', resource: 'drugstores', resourceId: m.drugstore.id, outcome: 'success', requestId });
  return toDrugstoreDto(row!, m.role);
}

export async function softDelete(db: Db, m: Membership, userId: string, requestId: string) {
  await db
    .update(drugstores)
    .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
    .where(eq(drugstores.id, m.drugstore.id));
  await audit(db, { userId, action: 'drugstores.delete', resource: 'drugstores', resourceId: m.drugstore.id, outcome: 'success', requestId });
}

// ---- Miembros ----

export function toMemberDto(r: { userId: string; email: string; fullName: string; role: Role; createdAt: Date }) {
  return { userId: r.userId, email: r.email, fullName: r.fullName, role: r.role, createdAt: r.createdAt.toISOString() };
}

const memberSelect = {
  userId: members.userId,
  email: users.email,
  fullName: users.fullName,
  role: members.memberRole,
  createdAt: members.createdAt,
};

export async function listMembers(db: Db, drugstoreId: string) {
  const rows = await db
    .select(memberSelect)
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(and(eq(members.drugstoreId, drugstoreId), isNull(members.deletedAt)))
    .orderBy(members.createdAt);
  return rows.map(toMemberDto);
}

async function findMember(db: Db, drugstoreId: string, userId: string) {
  const [row] = await db
    .select(memberSelect)
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(and(eq(members.drugstoreId, drugstoreId), eq(members.userId, userId), isNull(members.deletedAt)))
    .limit(1);
  return row;
}

/** El propietario gestiona a todos menos a sí mismo; el administrador solo gestiona operadores. */
function canManage(actor: Role, target: Role): boolean {
  if (target === 'propietario') return false;
  return actor === 'propietario' || (actor === 'administrador' && target === 'operador');
}

const forbidden = () => new AppError(403, 'FORBIDDEN', 'Su rol no permite gestionar a ese miembro');
const ownerLocked = () => new AppError(409, 'CONFLICT', 'No se puede modificar ni retirar al propietario de la droguería');

export async function addMember(db: Db, m: Membership, actorId: string, input: { email: string; role: Role }, requestId: string) {
  if (!canManage(m.role, input.role)) throw forbidden();
  const [target] = await db.select().from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'No existe una cuenta con ese correo');
  if (await findMember(db, m.drugstore.id, target.id)) throw new AppError(409, 'CONFLICT', 'La persona ya es miembro de esta droguería');
  await db.insert(members).values({ drugstoreId: m.drugstore.id, userId: target.id, memberRole: input.role, createdBy: actorId, updatedBy: actorId });
  await audit(db, { userId: actorId, action: 'drugstores.member_add', resource: 'drugstore_members', resourceId: m.drugstore.id, outcome: 'success', requestId });
  return toMemberDto((await findMember(db, m.drugstore.id, target.id))!);
}

export async function changeMemberRole(db: Db, m: Membership, actorId: string, targetId: string, role: Role, requestId: string) {
  const target = await findMember(db, m.drugstore.id, targetId);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');
  if (target.role === 'propietario') throw ownerLocked();
  if (!canManage(m.role, target.role) || !canManage(m.role, role)) throw forbidden();
  await db
    .update(members)
    .set({ memberRole: role, updatedBy: actorId, updatedAt: new Date() })
    .where(and(eq(members.drugstoreId, m.drugstore.id), eq(members.userId, targetId), isNull(members.deletedAt)));
  await audit(db, { userId: actorId, action: 'drugstores.member_update', resource: 'drugstore_members', resourceId: m.drugstore.id, outcome: 'success', requestId });
  return toMemberDto((await findMember(db, m.drugstore.id, targetId))!);
}

export async function removeMember(db: Db, m: Membership, actorId: string, targetId: string, requestId: string) {
  const target = await findMember(db, m.drugstore.id, targetId);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'Recurso no encontrado');
  if (target.role === 'propietario') throw ownerLocked();
  if (targetId !== actorId && !canManage(m.role, target.role)) throw forbidden();
  await db
    .update(members)
    .set({ deletedAt: new Date(), updatedBy: actorId, updatedAt: new Date() })
    .where(and(eq(members.drugstoreId, m.drugstore.id), eq(members.userId, targetId), isNull(members.deletedAt)));
  await audit(db, { userId: actorId, action: 'drugstores.member_remove', resource: 'drugstore_members', resourceId: m.drugstore.id, outcome: 'success', requestId });
}

export { ROLE_RANK };
