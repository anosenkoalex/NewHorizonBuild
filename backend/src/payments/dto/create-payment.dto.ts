// backend/src/payments/dto/create-payment.dto.ts
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  dealId: string;
  dueDate: string; // ISO-строка, будем конвертить в Date в сервисе
  amount: number;
  status?: PaymentStatus;
  comment?: string;
}
