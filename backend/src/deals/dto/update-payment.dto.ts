// backend/src/deals/dto/update-payment.dto.ts
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentDto {
  // можно менять срок
  dueDate?: string;

  // можно менять сумму
  amount?: number;

  // можно править комментарий
  comment?: string | null;

  // смена статуса (PLANNED / PAID / OVERDUE)
  status?: PaymentStatus;

  // отметить как оплачен (или убрать оплату, если null/undefined)
  paidAt?: string | null;
}
