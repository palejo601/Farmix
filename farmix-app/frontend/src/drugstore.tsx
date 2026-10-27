import { createContext, useContext } from 'react';

export type Role = 'propietario' | 'administrador' | 'operador';
export interface Drugstore { id: string; name: string; city: string; expiryAlertDays: number; employeeCount: number | null; isDemo: boolean; role: Role }
export const DrugstoreCtx = createContext<{ drugstore: Drugstore; reload: () => void }>(null as never);
export const useDrugstore = () => useContext(DrugstoreCtx);
const RANK: Record<Role, number> = { operador: 1, administrador: 2, propietario: 3 };
export const atLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];
