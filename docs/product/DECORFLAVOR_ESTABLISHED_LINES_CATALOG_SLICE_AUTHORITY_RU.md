# Current Feature Authority — Established Lines Local Catalog Slice

## Паспорт

- Проект: DecorFlavor
- Функция: локальный импорт каталога продавца Established Lines
- Статус: ACTIVE
- Дата: 2026-08-18
- Решение владельца: добавить seller `established-lines` и поместить в его каталог уже сохранённую выгрузку с `https://www.establishedlines.com/`; убрать тестовые изображения.

## Результат и scope

Работающая витрина показывает 30 ранее сохранённых позиций Established Lines вместо тестовой мозаики и вымышленных товаров этого продавца. Скрипт читает только `apps/portal/public/pilots/established-lines-30.json`, валидирует каждую строку, создаёт или находит import job по SHA-256 файла, записывает товар, источник, листинг, snapshot, evidence и source media через существующий universal import. Initial owner-authorized набор публикуется в storefront и marketplace; три прежних seller demo SKU архивируются.

## Подтверждённое состояние

- JSON содержит 30 валидированных строк и URL товаров/изображений на Established Lines.
- В seed существуют организация, storefront, роли и локальные тестовые аккаунты для `established-lines`.
- Универсальный импорт сохраняет товары как `DRAFT`; публичные API показывают только `PUBLISHED`.

## Ограничения и решения

- DEC-EL-001: не выполнять новую выгрузку и не обращаться к внешнему сайту во время local import.
- DEC-EL-002: удалить `/index2` demo mosaic и 20 `demoImg` файлов; source media — HTTPS URL из сохранённой выгрузки, не тестовые изображения.
- ASSUMPTION-EL-001: 30 позиций публикуются как initial owner-authorized набор для тестирования P0. Пересмотреть права перед production и любым refresh.
- URL допускаются только по HTTPS на `www.establishedlines.com`, без credentials. Никаких платежей, копирования медиа в storage или production deployment в этот срез не входит.

## Проверка

1. Unit test fixture подтверждает checksum, 30 последовательных строк и source/media URL только на разрешённом домене.
2. `pnpm db:seed:catalog` должен вывести `COMPLETED`, `30` imported rows и минимум `30` published products.
3. Повторный запуск не создаёт дубли; checksum-конфликт останавливает импорт.
4. Поиск в web application не находит `/demoImg` или demo mosaic.

## Следующий разрешённый срез

Управляемое обновление источника и локальное зеркалирование media — только после отдельного решения о правах, storage и расписании.
