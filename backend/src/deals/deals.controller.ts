// backend/src/deals/deals.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { DealsService } from './deals.service.js';
import { CreateDealDto } from './dto/create-deal.dto.js';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  async findAll() {
    return this.dealsService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateDealDto) {
    return this.dealsService.create(dto);
  }
}
