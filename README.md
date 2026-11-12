<div align="center">

# 🛠️ API Tools

**Перехват, просмотр и подмена fetch/XHR запросов в браузере**

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)](https://github.com/Aramegab/api-tools/releases)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-red?style=for-the-badge)](LICENSE)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Userscript-black?style=for-the-badge&logo=tampermonkey)](https://www.tampermonkey.net/)

</div>

---

## 📖 О проекте

**API Tools** - это мощный userscript для Tampermonkey, который позволяет в реальном времени перехватывать, просматривать и модифицировать **все** сетевые запросы (`fetch` и `XMLHttpRequest`) на любом сайте.

Не нужно открывать DevTools, не нужно настраивать прокси - просто установите скрипт и получите полный контроль над API-запросами прямо в браузере.

<div align="center">

| 🔍 Просмотр | ✏️ Модификация | 📥 Экспорт |
|:---:|:---:|:---:|
| Все запросы в одном окне | Подмена URL, заголовков, тела | Копирование в cURL / fetch |
| Поиск по URL, телу, ответу | Мок-ответы (mock) | Скачивание отчёта в .txt |
| Подсветка медленных запросов | Правила по glob / regex | Маскировка Authorization |

</div>

---

## ✨ Возможности

### 🔍 Логирование запросов
- Перехват **всех** `fetch` и `XMLHttpRequest` запросов на странице
- Метод, URL, статус-код, время выполнения
- Тела запросов и ответов (JSON, FormData, URLSearchParams, Blob, ArrayBuffer)
- Заголовки запроса и ответа
- Подсветка медленных запросов (настраиваемый порог)
- Автоматическая обрезка больших тел (настраиваемый лимит)
- Автоскролл к новым записям

### ✏️ Правила подмены
- **URL** - перенаправление запросов на другой endpoint
- **Заголовки** - добавление/замена любых заголовков
- **Тело** - замена целиком или слияние с оригиналом (JSON merge)
- **Мок-ответы** - полностью синтезированный ответ без реального запроса
- Типы match: `substring`, `glob`, `regex`
- Фильтр по HTTP-методу (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Экспорт/импорт правил в JSON
- Включение/отключение каждого правила отдельно

### 🎨 Интерфейс
- Светлая / тёмная / автоматическая тема
- Компактный режим для маленьких экранов
- Поиск по всем полям запроса
- Просмотр в модальном окне, не мешает странице
- Копирование в **cURL**, **fetch**, **полный отчёт**
- Скачивание отчёта всех запросов в `.txt`

---

## 🚀 Установка

### Шаг 1. Установите Tampermonkey

Tampermonkey - это менеджер userscripts, который позволяет запускать пользовательские скрипты на сайтах.

<table>
<tr>
<td align="center" width="33%">

**🌐 Chrome / Edge / Brave / Opera**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)

</td>
<td align="center" width="33%">

**🦊 Firefox**

[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--ons-FF7139?style=flat-square&logo=firefox&logoColor=white)](https://addons.mozilla.org/firefox/addon/tampermonkey/)

</td>
<td align="center" width="33%">

**🧭 Safari**

[![App Store](https://img.shields.io/badge/Safari-App%20Store-000000?style=flat-square&logo=safari&logoColor=white)](https://apps.apple.com/app/tampermonkey/id1482490089)

</td>
</tr>
</table>

> ⚠️ **Важно:** после установки Tampermonkey зайдите в его настройки → **Settings** → включите **"Config mode: Advanced"** и разрешите **"Allow access to file URLs"** (для Chrome/Edge).

---

### Шаг 2. Установите API Tools

Есть **два способа** - выберите любой.

#### 🔵 Способ 1: Прямая установка (рекомендуется)

1. Откройте файл `api-tools.user.js` в этом репозитории
2. Нажмите кнопку **Raw** (справа сверху)
3. Tampermonkey автоматически предложит установить скрипт → нажмите **Install**
4. Готово! 🎉

**Или перейдите по прямой ссылке:**

👉 **[Установить API Tools](https://raw.githubusercontent.com/Aramegab/api-tools/main/api-tools.user.js)**

> Если ссылка открывает исходный код - скопируйте его и создайте новый скрипт в Tampermonkey вручную (Способ 2).

---

#### 🟢 Способ 2: Ручная установка

1. Откройте иконку **Tampermonkey** в панели браузера → **Create a new script**
2. Удалите весь шаблонный код
3. Вставьте содержимое файла [`api-tools.js`](api-tools.js)
4. Сохраните: **Ctrl+S** (или **Cmd+S** на macOS)
5. Обновите страницу любого сайта - скрипт активируется

---

### Шаг 3. Проверка

1. Откройте **любой** сайт (например, `https://example.com`)
2. В правом нижнем углу появится **плавающая кнопка** API Tools с иконкой активности
3. Совершите какое-нибудь действие на странице (например, откройте меню)
4. Кнопка покажет количество перехваченных запросов
5. Нажмите на неё → **Просмотр** → откроется окно со всеми запросами

---

---

## 🎯 Быстрый старт: 3 примера использования

### Пример 1. Подменить ответ API (мок)

Хотите протестировать UI без реального бэкенда? Подмените ответ:

1. Откройте **Настройки** → **Правила** → **Добавить правило**
2. Заполните:
   - **Match**: `/api/users`
   - **Метод**: `GET`
   - **Mock status**: `200`
   - **Mock headers**: `Content-Type: application/json`
   - **Mock body**:
     ```json
     {"id":1,"name":"Test User","email":"test@example.com"}
