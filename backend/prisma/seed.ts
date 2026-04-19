import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const districtCount = await prisma.district.count();
  if (districtCount === 0) {
    const districtNames = [
      'Люлин', 'Надежда', 'Искър', 'Слатина', 'Красно село',
      'Лозенец', 'Витоша', 'Овча купел', 'Банкя', 'Връбница',
      'Подуяне', 'Средец', 'Оборище', 'Сердика', 'Красна поляна',
      'Илинден', 'Триадица', 'Студентски', 'Панчарево', 'Нови Искър',
    ];

    await prisma.district.createMany({
      data: districtNames.map((name) => ({ name, city: 'София' })),
    });

    const districts = await prisma.district.findMany();
    const byName = Object.fromEntries(districts.map((d) => [d.name, d.id]));

    const neighborPairs: [string, string][] = [
      ['Люлин', 'Овча купел'],
      ['Люлин', 'Красна поляна'],
      ['Надежда', 'Сердика'],
      ['Надежда', 'Връбница'],
      ['Сердика', 'Илинден'],
      ['Красна поляна', 'Илинден'],
      ['Красна поляна', 'Красно село'],
      ['Красно село', 'Триадица'],
      ['Триадица', 'Средец'],
      ['Средец', 'Оборище'],
      ['Оборище', 'Подуяне'],
      ['Подуяне', 'Слатина'],
      ['Слатина', 'Искър'],
      ['Витоша', 'Триадица'],
      ['Витоша', 'Студентски'],
      ['Студентски', 'Лозенец'],
      ['Лозенец', 'Средец'],
    ];

    for (const [a, b] of neighborPairs) {
      if (byName[a] && byName[b]) {
        await prisma.districtNeighbor.createMany({
          data: [
            { districtId: byName[a], neighborDistrictId: byName[b] },
            { districtId: byName[b], neighborDistrictId: byName[a] },
          ],
          skipDuplicates: true,
        });
      }
    }

    console.log(`✔ Seeded ${districtNames.length} districts`);
  }

  {
    const electronicsData = [
      { name: 'Телевизор',          category: 'Дисплеи',            defaultWeight: 15,  defaultVolume: 0.15,  isSmallItem: false },
      { name: 'Лаптоп',             category: 'Компютри',           defaultWeight: 2,   defaultVolume: 0.005, isSmallItem: false },
      { name: 'Настолен компютър',  category: 'Компютри',           defaultWeight: 8,   defaultVolume: 0.02,  isSmallItem: false },
      { name: 'Монитор',            category: 'Дисплеи',            defaultWeight: 5,   defaultVolume: 0.05,  isSmallItem: false },
      { name: 'Телефон / Таблет',   category: 'Мобилни устройства', defaultWeight: 0.3, defaultVolume: 0.001, isSmallItem: true  },
      { name: 'Перална машина',     category: 'Уреди',              defaultWeight: 70,  defaultVolume: 0.35,  isSmallItem: false },
      { name: 'Хладилник',          category: 'Уреди',              defaultWeight: 60,  defaultVolume: 0.4,   isSmallItem: false },
      { name: 'Микровълнова печка', category: 'Уреди',              defaultWeight: 12,  defaultVolume: 0.04,  isSmallItem: false },
      { name: 'Принтер',            category: 'Офис техника',       defaultWeight: 5,   defaultVolume: 0.02,  isSmallItem: false },
      { name: 'Климатик',           category: 'Уреди',              defaultWeight: 25,  defaultVolume: 0.1,   isSmallItem: false },
      { name: 'Прахосмукачка',      category: 'Уреди',              defaultWeight: 5,   defaultVolume: 0.05,  isSmallItem: false },
      { name: 'Кабели / Аксесоари', category: 'Аксесоари',          defaultWeight: 1,   defaultVolume: 0.003, isSmallItem: true  },
      { name: 'Миксер',             category: 'Малки уреди',        defaultWeight: 1.5, defaultVolume: 0.004, isSmallItem: true  },
      { name: 'Кафемашина',         category: 'Малки уреди',        defaultWeight: 3,   defaultVolume: 0.006, isSmallItem: true  },
      { name: 'Ютия',               category: 'Малки уреди',        defaultWeight: 1.2, defaultVolume: 0.003, isSmallItem: true  },
    ];

    for (const item of electronicsData) {
      await prisma.electronicsItem.upsert({
        where: { name: item.name },
        update: { isSmallItem: item.isSmallItem },
        create: item,
      });
    }

    console.log('✔ Seeded/updated electronics items');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
