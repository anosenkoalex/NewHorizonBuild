import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateDealDto, DealsService } from './deals.service';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  findAll() {
    return this.dealsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDealDto) {
    return this.dealsService.create(dto);
  }
}
