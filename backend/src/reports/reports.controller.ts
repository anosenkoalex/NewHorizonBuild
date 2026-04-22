// backend/src/reports/reports.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ReportsService,
  SalesReportFilters,
} from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
  }

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD)
  getSales(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filters: SalesReportFilters = {};

    const fromDate = this.parseDate(from);
    const toDate = this.parseDate(to);

    if (fromDate) filters.from = fromDate;
    if (toDate) filters.to = toDate;

    return this.reportsService.getSalesReport(filters);
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SALES_HEAD)
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }
}