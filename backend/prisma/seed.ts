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

  const electronicsCount = await prisma.electronicsItem.count();
  if (electronicsCount === 0) {
    await prisma.electronicsItem.createMany({
      data: [
        { name: 'Телевизор', category: 'Дисплеи', defaultWeight: 15, defaultVolume: 0.15 },
        { name: 'Лаптоп', category: 'Компютри', defaultWeight: 2, defaultVolume: 0.005 },
        { name: 'Настолен компютър', category: 'Компютри', defaultWeight: 8, defaultVolume: 0.02 },
        { name: 'Монитор', category: 'Дисплеи', defaultWeight: 5, defaultVolume: 0.05 },
        { name: 'Телефон / Таблет', category: 'Мобилни устройства', defaultWeight: 0.3, defaultVolume: 0.001 },
        { name: 'Перална машина', category: 'Уреди', defaultWeight: 70, defaultVolume: 0.35 },
        { name: 'Хладилник', category: 'Уреди', defaultWeight: 60, defaultVolume: 0.4 },
        { name: 'Микровълнова печка', category: 'Уреди', defaultWeight: 12, defaultVolume: 0.04 },
        { name: 'Принтер', category: 'Офис техника', defaultWeight: 5, defaultVolume: 0.02 },
        { name: 'Климатик', category: 'Уреди', defaultWeight: 25, defaultVolume: 0.1 },
        { name: 'Прахосмукачка', category: 'Уреди', defaultWeight: 5, defaultVolume: 0.05 },
        { name: 'Кабели / Аксесоари', category: 'Аксесоари', defaultWeight: 1, defaultVolume: 0.003 },
      ],
    });

    console.log('✔ Seeded 12 electronics items');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
