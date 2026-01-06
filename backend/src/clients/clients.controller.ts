import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: { fullName: string; phone: string; email?: string | null },
  ) {
    return this.clientsService.create(body);
  }
}
