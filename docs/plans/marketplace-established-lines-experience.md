# Marketplace + Established Lines experience

Статус: implemented, awaiting owner review  
Уровень: Level 1  
Дата: 27 августа 2026  
Owner authorization: прямое поручение подключить 130 товаров и улучшить главную, каталог, карточку и внутреннюю витрину Established Lines.

## Бизнес-результат

Покупатель открывает публичный DecorFlavor marketplace, видит полный подготовленный каталог из 130 товаров, может фильтровать коллекцию, перейти во внутренний магазин Established Lines и изучить полноценную карточку товара с полной галереей и коммерчески важными характеристиками.

## KNOWN

- Публичный marketplace находится в `apps/web`.
- Главная уже имеет search-first визуальную систему и snapshot fallback.
- Текущий fallback использует только старый snapshot из 30 карточек.
- Объединённый валидированный snapshot содержит 130 карточек и 1 922 URL изображений.
- Established Lines является первым внутренним brand store.
- API остаётся приоритетным источником для опубликованных товаров; snapshot используется как read-only fallback.

## CONFLICT

- Phase 2 report описывает более раннее состояние без последующих buyer/order функций. Текущий код и прямое поручение владельца имеют приоритет для этого UI-среза.
- Старые marketplace страницы используют две разные визуальные системы: search-first главная и более ранние `df-*` catalog/product/storefront экраны.

## ASSUMPTIONS

- A-001: язык публичного marketplace остаётся английским. Изменение обратимо и не влияет на модель данных.
- A-002: при недоступном API все 130 карточек доступны для чтения из bundled snapshot; операции резервирования в snapshot-режиме не показываются.
- A-003: изображения продолжают использовать проверенные source URLs до отдельного media-ingest среза.
- A-004: storefront Established Lines использует общую search-first систему DecorFlavor, но получает собственный hero, статистику и scoped product links.

## Scope

- заменить 30-card fallback на объединённый 130-card snapshot;
- обеспечить полный snapshot fallback для `/`, `/catalog`, `/products/[slug]`, `/dealers/established-lines` и storefront product pages;
- унифицировать главную, каталог и storefront на одной responsive search/filter/grid системе;
- сделать Established Lines первым внутренним brand store с собственным hero и полной коллекцией;
- переработать product detail: полная интерактивная галерея, sticky commercial summary, era/SKU/dimensions/condition/source/dealer details, trust and enquiry affordances;
- сохранить API-first поведение и существующий live reservation action;
- проверить build, typecheck/unit tests и desktop/mobile browser routes.

## Out of scope

- импорт новых товаров из публичного marketplace UI;
- миграции, production deployment, DNS и Vercel release;
- платежи, налоги, доставка и изменение order state machine;
- скачивание и зеркалирование исходных изображений;
- изменение seller/admin portal.

## Негативные сценарии

- API недоступен: marketplace остаётся доступным через snapshot.
- Неизвестный product/storefront slug: показывается controlled not-found state.
- У товара нет изображения или отдельного поля: UI показывает понятный fallback и не ломает layout.
- Snapshot-карточка не предлагает неработающий live reservation.

## Verification contract

- `establishedLinesSnapshot()` возвращает 130 листинговых карточек;
- detail lookup возвращает все изображения выбранного товара;
- `pnpm --filter @atlas/web typecheck`, unit tests и production build проходят;
- `/`, `/catalog`, `/dealers/established-lines` и один product route визуально проверены на desktop и mobile;
- на storefront и marketplace отображаются 130 товаров, `era` видна там, где она есть, а product gallery не ограничена тремя изображениями.

## Следующий разрешённый срез

Только после owner review: media mirroring в Supabase Storage и подключение live API/worker deployment.

## Evidence · 27 августа 2026

- production build `@atlas/web`: passed;
- Vitest: 7/7 passed, включая 3 snapshot mapping tests;
- HTTP smoke: `/`, `/catalog`, `/dealers/established-lines` и product detail возвращают `200`;
- DOM smoke: 130 catalog cards, 130 Established Lines cards, fixed global header;
- gallery interaction: переключение изображений работает, у проверенной карточки доступны 9 фото;
- data audit: 130 товаров, 1 922 фото, минимум 6 и в среднем 14,8 фото на товар; 0 пропусков цены, описания и source URL;
- responsive visual QA: главная, каталог, storefront и product detail проверены на 1440×1000 и 390×844.
