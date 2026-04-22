import { DealStatus } from '@prisma/client';

export class UpdateDealStatusDto {
  status!: DealStatus;
  comment?: string;
}