// backend/src/reports/reports.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import {
  ReportsService,
  SalesReportFilters,
} from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Отчёт по продажам — БЕЗ guard'ов, чтобы спокойно работал и Dashboard, и вкладка "Отчёты"
  @Get('sales')
  getSales(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filters: SalesReportFilters = {};
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);

    return this.reportsService.getSalesReport(filters);
  }

  // Сводка для Dashboard — тоже без guard'ов
  @Get('dashboard')
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }
}
