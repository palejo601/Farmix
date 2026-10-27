import { z } from 'zod';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const drugstoreParams = z.object({ id: z.uuid() });
export const params = z.object({ id: z.uuid(), fileId: z.uuid() });

export const fileDto = z.object({
  id: z.uuid(), originalName: z.string(), mimeType: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  sizeBytes: z.number().int(), createdAt: z.iso.datetime(),
});
export const fileResponse = z.object({ file: fileDto });
