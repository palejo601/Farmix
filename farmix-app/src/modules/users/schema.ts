import { z } from 'zod';

export const updateProfileBody = z.object({ fullName: z.string().trim().min(2).max(120) });
