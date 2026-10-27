import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 usa Argon2id por defecto.
export const hashPassword = (plain: string) => hash(plain);

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    return await verify(stored, plain);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
/** Verificación contra un hash falso para igualar tiempos cuando el correo no existe. */
export async function verifyDummy(plain: string): Promise<void> {
  dummy ??= hashPassword('contrasena-ficticia-no-valida');
  await verifyPassword(await dummy, plain);
}
