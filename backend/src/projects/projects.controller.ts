// backend/src/projects/projects.controller.ts
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ProjectsService, UpdateProject3DInput } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  // Обновление 3D-полей проекта (только ADMIN)
  @Patch(':id/3d')
  @Roles(UserRole.ADMIN)
  update3D(
    @Param('id') id: string,
    @Body() body: UpdateProject3DInput,
  ) {
    return this.projectsService.update3D(id, body);
  }
}
