import { PrismaClient, Prisma, UnitStatus, UnitType, DealStatus, DealType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.create({
    data: {
      name: 'Demo ЖК NewHorizon',
      description: 'Демонстрационный проект с предзаполненными данными',
      address: 'г. Алматы, проспект Демоданных, 1',
    },
  });

  const building = await prisma.building.create({
    data: {
      projectId: project.id,
      label: 'Корпус 1',
      numberOfFloors: 2,
    },
  });

  const [floor1, floor2] = await Promise.all([
    prisma.floor.create({
      data: {
        buildingId: building.id,
        number: 1,
      },
    }),
    prisma.floor.create({
      data: {
        buildingId: building.id,
        number: 2,
      },
    }),
  ]);

  const units = await prisma.$transaction([
    prisma.unit.create({
      data: {
        type: UnitType.APARTMENT,
        status: UnitStatus.FREE,
        projectId: project.id,
        buildingId: building.id,
        floorId: floor1.id,
        number: '1A',
        area: 45.5,
        rooms: 2,
        price: new Prisma.Decimal(9500000),
      },
    }),
    prisma.unit.create({
      data: {
        type: UnitType.APARTMENT,
        status: UnitStatus.RESERVED,
        projectId: project.id,
        buildingId: building.id,
        floorId: floor1.id,
        number: '1B',
        area: 52.3,
        rooms: 3,
        price: new Prisma.Decimal(11300000),
      },
    }),
    prisma.unit.create({
      data: {
        type: UnitType.APARTMENT,
        status: UnitStatus.SOLD,
        projectId: project.id,
        buildingId: building.id,
        floorId: floor2.id,
        number: '2A',
        area: 61.7,
        rooms: 3,
        price: new Prisma.Decimal(14650000),
      },
    }),
    prisma.unit.create({
      data: {
        type: UnitType.COMMERCIAL,
        status: UnitStatus.FREE,
        projectId: project.id,
        buildingId: building.id,
        floorId: floor1.id,
        number: 'C1',
        area: 80.2,
        price: new Prisma.Decimal(23800000),
      },
    }),
    prisma.unit.create({
      data: {
        type: UnitType.COMMERCIAL,
        status: UnitStatus.SOLD,
        projectId: project.id,
        buildingId: building.id,
        floorId: floor2.id,
        number: 'C2',
        area: 92.5,
        price: new Prisma.Decimal(26500000),
      },
    }),
  ]);

  const [clientAnna, clientBauyrzhan] = await Promise.all([
    prisma.client.create({
      data: {
        fullName: 'Анна Смирнова',
        phone: '+7 777 000 11 22',
        email: 'anna@example.com',
      },
    }),
    prisma.client.create({
      data: {
        fullName: 'Бауыржан Тлеуханов',
        phone: '+7 708 333 44 55',
        email: 'bauyrzhan@example.com',
      },
    }),
  ]);

  const [adminUser, managerUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@newhorizon.kz',
        fullName: 'Администратор Системы',
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@newhorizon.kz',
        fullName: 'Мария Менеджер',
        role: UserRole.MANAGER,
      },
    }),
  ]);

  const unitForDeal1 = units[2];
  const unitForDeal2 = units[4];

  await Promise.all([
    prisma.deal.create({
      data: {
        unitId: unitForDeal1.id,
        clientId: clientAnna.id,
        managerId: managerUser.id,
        type: DealType.SALE,
        status: DealStatus.COMPLETED,
      },
    }),
    prisma.deal.create({
      data: {
        unitId: unitForDeal2.id,
        clientId: clientBauyrzhan.id,
        managerId: managerUser.id,
        type: DealType.SALE,
        status: DealStatus.COMPLETED,
      },
    }),
  ]);

  console.log('Demo data has been seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
