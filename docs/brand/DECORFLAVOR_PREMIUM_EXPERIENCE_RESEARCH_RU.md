# DecorFlavor: исследование premium-визуального опыта

**Дата исследования:** 18 августа 2026  
**Статус:** `RESEARCH / PROPOSED` — рекомендации для принятия владельцем, не утверждённое ТЗ и не разрешение на реализацию.  
**Область:** публичный marketplace `decorflavor.com`; визуальная граница с внутренним Data Pump.  
**Ближайший вертикальный срез после принятия:** public homepage + каталог + карточка предмета.

## 1. Вывод

DecorFlavor следует позиционировать как **digital gallery для collectible furniture и decor**,
в которой можно купить предмет, собрать проект и получить экспертную помощь. Это не массовый
маркетплейс и не стерильный luxury-магазин.

Визуальная формула:

> **Editorial gallery × trusted marketplace × professional sourcing.**

Пользователь должен быстро видеть предмет, но принимать решение через историю, материал,
происхождение, состояние и уверенность в доставке. Важнее спокойная курация и достоверность,
чем количество баннеров или скидочных механик.

## 2. Контекст и границы

### KNOWN

- Название публичного продукта — `DecorFlavor`; канонический домен —
  `https://decorflavor.com`.
- Горизонтальный логотип применяется в публичных шапках; stacked-версия — для компактных
  размещений и favicon. Детальные правила — в
  [`DECORFLAVOR_BRAND_ASSETS.md`](./DECORFLAVOR_BRAND_ASSETS.md).
- Публичная витрина и Data Pump решают разные задачи.

### Рекомендуемая граница

| Поверхность | Роль | Визуальный характер |
| --- | --- | --- |
| Public marketplace | Discovery, доверие, предмет, запрос, покупка, проект дизайнера | editorial/gallery, тёплый, спокойный, image-first |
| Data Pump | импорт, структура данных, качество, операционные действия | функциональный, плотнее по данным, без имитации публичной витрины |

### OUT OF SCOPE

- Реализация экранов, редизайн Data Pump, выбор платных шрифтов и лицензирование.
- Цены, оплата, логистика, правила возврата, фактическая гарантия подлинности.
- Изменение DNS, Vercel и production-настроек.

### OWNER DECISIONS, нужные перед реализацией

1. В первой версии цена будет открытой, `Request price` или оба режима?
2. Какие подтверждения реально доступны: seller vetting, authenticity, возврат, страхование,
   доставка? Не показывать в интерфейсе обещания, которые не поддержаны процессом.
3. Нужна ли Trade-программа в P0 или достаточно `Add to project` + inquiry?
4. Основной язык и рынки запуска: US-only или international.

## 3. Карта конкурентов и выводы

| Конкурент | Наблюдаемый подход | Что перенять | Не переносить буквально |
| --- | --- | --- | --- |
| [1stDibs](https://www.1stdibs.com/) | глобальный luxury marketplace: стили, авторы, editorial, защита покупки, Trade | структурированный поиск; видимые trust-механики; сервис для дизайнеров | тяжёлое мегаменю и бесконечная плотность каталога |
| [Chairish](https://www.chairish.com/) | curated vintage, частые новые поступления, тематические edit-подборки | «new arrivals», живые коллекции, resale как ценность | промо-ритм, который снижает галерейное ощущение |
| [Pamono](https://www.pamono.com/) | marketplace + magazine; фильтры по эпохе, стилю, стране, материалу и размерам | предметные фильтры; editorial как часть discovery | перегружать стартовый экран всей фильтрацией |
| [The Invisible Collection](https://theinvisiblecollection.com/about/) | онлайн-галерея collectible contemporary design | предмет и дизайнер как герой; меньше, но лучше отобранного | недоступность навигации для нового покупателя |
| [Artemest Trade](https://artemest.com/en-gb/trade) | bespoke, samples, moodboards, project folders, персональная поддержка | проектные папки, sourcing, человеческая консультация | сложный B2B-процесс до появления спроса |
| [The Future Perfect](https://www.thefutureperfect.com/) | выставки, коллекции и дома как narrative-commerce | подавать подборки как события и выставки | заменять этим базовые поиск и конверсию |

### Конкурентный тезис

У крупных игроков уже есть ассортимент и операционная глубина. Преимущество DecorFlavor должно
быть в **ясной, личной и менее перегруженной курации**: предметы с характером, доказуемые детали,
быстрый путь к профессиональному диалогу.

## 4. Сигналы рынка на август 2026

### Интерьер и предметный язык

- В premium-интерьерах усиливаются индивидуальность, мастерство, устойчивость и experience, а не
  универсальная нейтральность. [Maison&Objet 2026](https://www.maison-objet.com/en/paris/magazine/deco-trends/a-market-under-pressure-yet-firmly-on-the-move)
  отмечает distinctiveness, craftsmanship, sustainability и experience как ключевые силы рынка.
- Визуальная палитра движется к тёплым природным нейтралям, глубоким синим/индиго, земляным,
  ягодным и латунным акцентам. [Dulux 2026](https://www.dulux.com.au/colour/colour-trends/2026-forecast/)
  описывает одновременно calm, reconnection и более богатую, эклектичную палитру.
- Сильны raw material, стекло, дерево, fibre, clay и stone; предмет должен ощущаться тактильным,
  а не как безликий cut-out на карточке. [Wallpaper* о Maison&Objet 2026](https://www.wallpaper.com/design-interiors/maison-and-objet-2026)

### Luxury commerce

- Значение приобретают частный сервис, knowledgeable advisor, персонализация и discovery.
  [McKinsey State of Luxury 2026](https://www.mckinsey.com/industries/retail/our-insights/state-of-luxury)
  рекомендует использовать AI для усиления уверенности клиента, а не замены человеческого контакта.
- В исследовании [EY Luxury Client Index 2026](https://www.ey.com/en_nl/newsroom/2026/06/ey-luxury-client-index-2026-new-ownership-models-experiences-and-ai-could-reshape-how-aspirational-clients-engage-with-luxury-brands)
  94% респондентов допускают, что AI улучшает luxury-shopping; наиболее ожидаемы поиск и
  персональные рекомендации. Для DecorFlavor это означает **объяснимый sourcing assistant**, а
  не навязчивый чат-бот.

### UI и типографика

- E-commerce 2026 сочетает простую навигацию с визуальным языком бренда; мягкая текстура и
  editorial-композиция допустимы, если не скрывают товар и действия. [Shopify UX trends](https://www.shopify.com/blog/ux-design-trends)
- Высококонтрастный serif снова воспринимается как знак ручной работы, истории и постоянства;
  именно эти качества нужны collectible-маркетплейсу. [Creative Bloq: typography 2026](https://www.creativebloq.com/design/fonts-typography/breaking-rules-and-bringing-joy-top-typography-trends-for-2026)

## 5. Рекомендуемый дизайн-язык

### Принципы

1. **Object before interface.** Фото, фактура и масштаб предмета важнее декоративного UI.
2. **Quiet confidence.** Много воздуха, ровная сетка, без тревожных счётчиков и агрессивных sale-блоков.
3. **Proof over hype.** Происхождение, condition, material, dimensions и shipping должны быть
   доступнее, чем рекламные утверждения.
4. **Editorial, not ornamental.** Выразительность строится композицией, фото и типографикой, а
   не эффектами, градиентами и псевдо-3D.
5. **Human service visible.** «Speak to a curator» и «Source for my project» — полноценные
   маршруты, а не мелкая ссылка в footer.

### Цветовые токены

| Роль | Значение | Применение |
| --- | --- | --- |
| Paper | `#F4F0E8` | основной тёплый фон |
| Surface | `#FFFEFA` | карточки, формы, light panels |
| Ink | `#1E211D` | заголовки и основной текст |
| Forest | `#173F31` | ключевые CTA, брендовый якорь |
| Olive | `#61705C` | вторичный текст, metadata |
| Aged brass | `#9B7A47` | редкий акцент, состояние/ремесло |
| Indigo | `#304B63` | curated/editorial акцент |
| Oxblood | `#6C3530` | редкое предупреждение или акцент |
| Line | `#D8D2C7` | границы и разделители |

Правило: одновременно не более одного акцентного цвета на экран. Не использовать яркие градиенты,
чистый `#FFFFFF` на всю страницу или холодный SaaS-синий как основной брендовый цвет.

### Типографика

| Слой | Рекомендация | Применение |
| --- | --- | --- |
| Display | `Instrument Serif` (variable) | hero, названия коллекций, крупные заголовки |
| UI/body | `DM Sans` (variable) | навигация, описание, формы, фильтры |
| Technical | `DM Mono` | SKU, год, размеры, provenance metadata |

- Display — крупный, но не ультратонкий: минимальный размер 36 px на mobile и 64 px на desktop.
- Body: 16–18 px, line-height 1.5–1.65; metadata: 11–12 px с умеренным tracking.
- Не использовать serif для длинных характеристик и не применять display-гарнитуру капсом.
- До внедрения проверить лицензию, поддержку кириллицы и реальные языки запуска. Если кириллица
  обязательна, выбрать семейства с полной поддержкой или подключить отдельный совместимый fallback.

### Фото и art direction

- Hero: реальный интерьер или крупный предмет в живом естественном свете; не коллаж из мелких SKU.
- Product photography: основной кадр 4:5 или 3:4, затем детали патина/фактура/конструктив и
  кадр масштаба в интерьере.
- Цветокоррекция: мягкий, естественный, с сохранением оттенка материалов; без агрессивного HDR.
- Не размещать текст поверх детализированной фотографии без подложки и достаточного контраста.

## 6. UX-архитектура публичного marketplace

### Шапка

- Горизонтальный DecorFlavor logo с сохранением пропорций и clear space.
- Primary navigation: `Shop`, `New arrivals`, `Collections`, `Stories`, `For designers`.
- Utility: search, saved items, `Talk to a curator`.
- На desktop — спокойная липкая шапка после первого экрана; на mobile — logo, search, menu,
  без второй строки навигации по умолчанию.

### Главная

1. **Hero:** 1 сильное изображение, короткий манифест, две равнозначные CTA: `Explore the collection`
   и `Source for a project`.
2. **Curated arrivals:** 4–8 предметов, не карусель из десятков карточек.
3. **Ways to discover:** era, material, room, maker, collection.
4. **Editorial feature:** мастер, интерьер, выставка или предмет с историей.
5. **Trust/service:** sourcing, condition review, protected delivery — только подтверждённые
   процессом обещания.
6. **Trade invitation:** не «скидка», а доступ к project folders, sourcing и персональной поддержке.

### Каталог и discovery

- На desktop: сетка 3 колонки с крупными изображениями; 2 — на tablet; 1–2 — на mobile.
- Фильтры: era, style, material, origin, designer/maker, dimensions, price, availability, condition.
- Активные фильтры всегда видны как removable chips; результат и sort не должны менять layout.
- Поиск принимает обычный язык: «Italian brass table lamp», «70s walnut sideboard».
- Curated entry points важнее «всех категорий»: `Sculptural seating`, `Objects with patina`,
  `For a considered dining room`.

### Карточка товара

Обязательные элементы: фото, maker/designer, название, эпоха или год, материал, цена либо
`Request price`, статус доступности, save. Hover показывает второе фото **только** на устройствах
с mouse; на touch всегда доступны явные действия.

Не помещать на карточку рейтинг, искусственный scarcity-текст, таймер, длинный description или
несколько конкурирующих CTA.

### Страница предмета

| Блок | Содержимое |
| --- | --- |
| Gallery | крупный основной кадр, детали, интерьерный масштаб, полноценные alt-тексты |
| Identity | maker/designer, название, дата/era, origin, material |
| Commerce | цена/request price, availability, delivery region, inquiry, add to project |
| Trust | condition с конкретным описанием, provenance, seller, что подтверждено |
| Specification | dimensions, weight, finish, SKU, care, технические документы при наличии |
| Narrative | история предмета, мастерская, почему он значим |
| Discovery | похожие предметы по форме/материалу/периоду — не просто случайные SKU |

`Add to project` и `Enquire` важнее безусловного `Add to cart` для дорогих и уникальных предметов.

### Для дизайнеров

Первая разумная версия:

- save items в project folder;
- shareable project link;
- inquiry с контекстом проекта;
- ручной sourcing request.

Позднее, после подтверждения процесса: trade pricing, sample ordering, quotes, multi-user project
management, tax documents и contract workflow.

## 7. UI-детали, accessibility и performance

### Компоненты и motion

- Радиусы 0–8 px: не «дружелюбный SaaS», а аккуратная gallery-геометрия.
- Границы 1 px `Line`; тени крайне мягкие и только для floating layer.
- Hover: 150–200 ms, небольшое изменение border/подъёма, никаких скачков карточки.
- `prefers-reduced-motion` отключает переходы, параллакс и autoplay.

### Доступность

- Контраст текста и CTA — минимум WCAG AA; цвет не единственный носитель статуса.
- Видимый keyboard focus; корректный порядок Tab; 44×44 px интерактивная область на touch.
- Слайдер галереи управляется с клавиатуры и имеет текстовые подписи к изображениям.
- Фильтры объявляют изменение числа результатов screen reader-у.

### Производительность

- LCP-изображение: responsive AVIF/WebP, определённые dimensions, priority только для hero.
- Не загружать весь catalogue и все фото до первого взаимодействия.
- Резервировать место для изображений, чтобы исключить layout shift.
- Не запускать тяжёлый 3D/AR в P0. Он оправдан только для ограниченного набора предметов после
  проверки влияния на конверсию и скорость.

## 8. Что нельзя делать

- Копировать визуальный стиль конкретного конкурента или использовать их фото/контент.
- Называть предмет «authenticated», «insured», «guaranteed» или обещать сроки без операционного
  подтверждения.
- Заменять профессионального куратора чатом, который выдаёт уверенные непроверенные сведения.
- Смешивать public marketplace с импортными таблицами Data Pump.
- Делать интерфейс «дорогим» только за счёт мелкого текста, неудобной навигации и низкого контраста.

## 9. Очерёдность внедрения после принятия

1. Утвердить позиционирование, язык, поддерживаемые trust-claims и режим цены.
2. Собрать token set: цвета, типографика, grid, spacing, кнопки, карточки, focus states.
3. Сделать homepage и каталог из реальных product data.
4. Сделать product page с прозрачными condition/provenance/delivery данными.
5. Добавить saved items и project folders.
6. Только затем — personalised search/sourcing assistant и полноценный Trade workflow.

### Контракт проверки первого public slice

- Шапка использует утверждённый горизонтальный logo без искажений.
- Homepage, catalog и product page работают на desktop и mobile, с keyboard navigation.
- Карточка и страница товара показывают реальные данные, а не придуманные proof/availability.
- Lighthouse/производительность и accessibility проверены до preview deployment.
- Владелец принимает visual direction по реальному preview до распространения на остальные экраны.

## 10. Источники исследования

### Конкуренты

- [1stDibs](https://www.1stdibs.com/) и [Trade 1st](https://www.1stdibs.com/trade/apply/)
- [Chairish](https://www.chairish.com/)
- [Pamono](https://www.pamono.com/)
- [The Invisible Collection](https://theinvisiblecollection.com/about/)
- [Artemest Trade](https://artemest.com/en-gb/trade)
- [The Future Perfect](https://www.thefutureperfect.com/)

### Рынок и дизайн

- [Maison&Objet 2026 Barometer](https://www.maison-objet.com/en/paris/magazine/deco-trends/a-market-under-pressure-yet-firmly-on-the-move)
- [Dulux Colour Forecast 2026](https://www.dulux.com.au/colour/colour-trends/2026-forecast/)
- [McKinsey State of Luxury 2026](https://www.mckinsey.com/industries/retail/our-insights/state-of-luxury)
- [EY Luxury Client Index 2026](https://www.ey.com/en_nl/newsroom/2026/06/ey-luxury-client-index-2026-new-ownership-models-experiences-and-ai-could-reshape-how-aspirational-clients-engage-with-luxury-brands)
- [Shopify UX design trends 2026](https://www.shopify.com/blog/ux-design-trends)
- [Creative Bloq: typography trends 2026](https://www.creativebloq.com/design/fonts-typography/breaking-rules-and-bringing-joy-top-typography-trends-for-2026)
