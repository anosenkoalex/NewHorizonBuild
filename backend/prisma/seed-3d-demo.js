// backend/prisma/seed-3d-demo.js
// Создаёт 2 активных demo-экрана (autoplay), чтобы /demo сразу показывал плитки.
// Запуск внутри контейнера:
//   docker compose exec backend node prisma/seed-3d-demo.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function genCode(len = 6) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function createWithUniqueCode(data, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const code = genCode(6);
    try {
      return await prisma.demoDisplay.create({ data: { ...data, code } });
    } catch (e) {
      // возможный конфликт unique по code — пробуем ещё раз
      if (String(e?.code ?? '').includes('P2002') || String(e?.message ?? '').toLowerCase().includes('unique')) {
        continue;
      }
      throw e;
    }
  }
  throw new Error('Не удалось сгенерировать уникальный code для demoDisplay');
}

async function main() {
  const project = await prisma.project.findFirst();
  if (!project) {
    throw new Error('Project not found. Сначала запусти: docker compose exec backend node dist/prisma/seed.js');
  }

  // чистим старые демо-экраны (чтобы не плодить)
  await prisma.demoDisplay.deleteMany({
    where: {
      name: { startsWith: 'Demo Экран' },
    },
  });

  const base = {
    isActive: true,
    autoplayEnabled: true,
    autoplayProjectId: project.id,
    autoplayDelaySec: 12,
  };

  const a = await createWithUniqueCode({ ...base, name: 'Demo Экран 1', office: 'Офис 1' });
  const b = await createWithUniqueCode({ ...base, name: 'Demo Экран 2', office: 'Офис 2' });

  console.log('OK demo displays created:');
  console.log(' -', a.name, 'code =', a.code);
  console.log(' -', b.name, 'code =', b.code);
  console.log('Open:');
  console.log(' - http://localhost/demo');
  console.log(' - http://localhost/demo/' + a.code);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma['$disconnect']());
