import { z } from 'zod';

export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const password = z.string().min(10, 'mínimo 10 caracteres').max(128);

export const registerBody = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(120),
  acceptPrivacy: z.literal(true, { error: 'Debe aceptar el aviso de privacidad' }),
});
export const loginBody = z.object({ email, password: z.string().min(1).max(128) });
export const changePasswordBody = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });
export const resetRequestBody = z.object({ email });
export const resetConfirmBody = z.object({ token: z.string().min(20).max(200), newPassword: password });

export const userDto = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  privacyAcceptedAt: z.iso.datetime().nullable(),
  deletionScheduledAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export const userResponse = z.object({ user: userDto });
export const messageResponse = z.object({ message: z.string() });

export type UserDto = z.infer<typeof userDto>;
