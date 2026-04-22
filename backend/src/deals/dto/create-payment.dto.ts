// backend/src/deals/dto/create-payment.dto.ts
export class CreatePaymentDto {
  // дата, когда платёж должен быть внесён (ISO-строка)
  dueDate!: string;

  // сумма платежа
  amount!: number;

  // комментарий / примечание
  comment?: string;
}
