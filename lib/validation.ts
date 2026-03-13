import { z } from 'zod';

export const withdrawFormSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0')
    .finite('Amount must be a valid number'),
  destination: z
    .string({ required_error: 'Destination is required' })
    .min(1, 'Destination is required')
    .trim(),
  confirm: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must confirm the withdrawal',
    }),
});

export type WithdrawFormData = z.infer<typeof withdrawFormSchema>;
