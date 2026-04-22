// backend/src/payments/dto/update-payment.dto.ts
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentDto {
  dueDate?: string; // ISO-строка
  amount?: number;
  status?: PaymentStatus;
  comment?: string;
}
