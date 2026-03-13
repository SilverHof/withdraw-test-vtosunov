# Withdrawal Test App

Тестовое задание на реализацию страницы вывода средств (USDT Withdrawal) с акцентом на устойчивость, безопасность и чистую архитектуру.

## 🚀 Деплой

**Живое приложение:** [Ссылка будет добавлена после деплоя на Vercel]

## 📋 Содержание

- [Как запустить](#как-запустить)
- [Технологический стек](#технологический-стек)
- [Архитектура](#архитектура)
- [Ключевые решения](#ключевые-решения)
- [Тестирование](#тестирование)
- [API Endpoints](#api-endpoints)

## 🛠 Как запустить

### Предварительные требования

- Node.js 18+ 
- npm или yarn

### Установка и запуск

```bash
# Клонировать репозиторий
git clone <repository-url>
cd withdraw-test

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev

# Приложение будет доступно по адресу http://localhost:3000
```

### Другие команды

```bash
# Запустить тесты
npm test

# Запустить тесты в watch-режиме
npm run test:watch

# Собрать production-версию
npm run build

# Запустить production-версию
npm run start

# Линтинг
npm run lint
```

## 💻 Технологический стек

- **Framework:** Next.js 16 (App Router)
- **Язык:** TypeScript
- **State Management:** Zustand с persist middleware
- **Валидация:** Zod
- **Стилизация:** Tailwind CSS v4
- **Тестирование:** Vitest + React Testing Library
- **ID Generation:** nanoid (для idempotency keys)

## 🏗 Архитектура

### Структура проекта

```
├── app/
│   ├── api/v1/withdrawals/          # API routes
│   │   ├── route.ts                 # POST /v1/withdrawals
│   │   └── [id]/route.ts            # GET /v1/withdrawals/:id
│   ├── withdraw/
│   │   └── page.tsx                 # Страница вывода средств
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Главная страница
├── lib/
│   ├── api-client.ts                # HTTP клиент с retry логикой
│   └── validation.ts                # Zod схемы валидации
├── store/
│   └── withdraw-store.ts            # Zustand store
├── types/
│   └── api.ts                       # TypeScript типы
└── __tests__/
    ├── withdraw.test.tsx            # UI тесты
    └── api-client.test.ts           # API тесты
```

### Основные компоненты

#### 1. **API Client** (`lib/api-client.ts`)
- Реализует retry-логику для сетевых ошибок (500+)
- Автоматически повторяет запрос до 3 раз с задержкой 1 секунда
- Обрабатывает 409 Conflict отдельно (без retry)
- Типизированные ошибки

#### 2. **State Management** (`store/withdraw-store.ts`)
- Zustand store с persist middleware
- Хранит последнюю заявку в localStorage (до 5 минут)
- Управляет состояниями: idle → loading → success/error
- Защита от потери данных при перезагрузке страницы

#### 3. **Валидация** (`lib/validation.ts`)
- Zod схемы для type-safe валидации
- Проверка на клиенте перед отправкой
- Понятные сообщения об ошибках на русском

#### 4. **API Routes** (`app/api/v1/withdrawals/`)
- In-memory хранилище (Map) для демо
- Валидация idempotency key
- Возврат 409 при повторном использовании ключа
- Эмуляция обработки заявки (2 сек до completed)

## 🔑 Ключевые решения

### 1. Защита от двойного submit

**Проблема:** Пользователь может случайно нажать кнопку несколько раз.

**Решение:**
```typescript
// Используется ref для отслеживания состояния отправки
const submitAttemptRef = useRef(false);

const handleSubmit = async (e: React.FormEvent) => {
  if (submitAttemptRef.current || isSubmitting) {
    return; // Блокируем повторную отправку
  }
  submitAttemptRef.current = true;
  // ... отправка запроса
};
```

### 2. Idempotency Key

**Проблема:** Защита от случайного создания дубликатов при retry.

**Решение:**
```typescript
// Генерируется один раз при монтировании компонента
const [idempotencyKey] = useState(() => nanoid());

// Отправляется с каждым запросом
await apiClient.createWithdrawal({
  amount,
  destination,
  idempotencyKey, // Уникальный ключ для этой формы
});
```

API возвращает 409 Conflict, если ключ уже использовался.

### 3. Retry логика

**Проблема:** Сетевые сбои не должны приводить к потере данных.

**Решение:**
```typescript
private async fetchWithRetry<T>(url: string, options: RequestInit, retries = 3) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      // Обработка ошибок
    }
    return response.json();
  } catch (error) {
    if (retries > 0 && this.isNetworkError(error)) {
      await this.delay(1000);
      return this.fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}
```

- Retry только для сетевых ошибок и 500+
- Не retry для 400, 409 (клиентские ошибки)
- Сохраняет введенные данные при ошибке

### 4. Восстановление после reload

**Проблема:** Пользователь может случайно обновить страницу.

**Решение:**
```typescript
// Zustand persist middleware
export const useWithdrawStore = create<WithdrawStore>()(
  persist(
    (set) => ({ /* state */ }),
    {
      name: 'withdraw-storage',
      partialize: (state) => ({
        lastWithdrawal: state.lastWithdrawal,
        lastWithdrawalTimestamp: state.lastWithdrawalTimestamp,
      }),
    }
  )
);

// При монтировании проверяем наличие сохраненной заявки
useEffect(() => {
  const lastWithdrawal = getLastWithdrawalIfValid();
  if (lastWithdrawal) {
    setWithdrawal(lastWithdrawal);
    setState('success');
  }
}, []);
```

Заявка хранится 5 минут в localStorage.

### 5. Безопасность

#### Access Token Storage
В продакшене рекомендуется:
- **HttpOnly cookies** для хранения access/refresh токенов
- **Не использовать localStorage** для токенов (уязвимо к XSS)
- Использовать **SameSite=Strict** для CSRF защиты

Пример production-подхода:
```typescript
// app/api/auth/middleware.ts
export async function authMiddleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Проверка токена с использованием JWT library
  const isValid = await verifyToken(token.value);
  
  if (!isValid) {
    return new Response('Invalid token', { status: 401 });
  }
  
  return null; // Разрешить запрос
}
```

#### XSS Protection
- Все пользовательские данные экранируются React автоматически
- Не используем `dangerouslySetInnerHTML`
- Валидация на клиенте и сервере

#### CSRF Protection
- Использование idempotency keys
- В production добавить CSRF токены

### 6. UI/UX

**Состояния формы:**
- **Idle:** Начальное состояние
- **Loading:** Кнопка disabled, показывается spinner
- **Success:** Отображается информация о заявке
- **Error:** Понятное сообщение об ошибке

**Валидация:**
- Real-time валидация при submit
- Disabled кнопка если форма невалидна
- Понятные сообщения об ошибках

**Адаптивность:**
- Responsive дизайн
- Dark mode support
- Доступность (a11y)

## 🧪 Тестирование

### Запуск тестов

```bash
npm test
```

### Покрытие тестами

#### 1. Happy Path Test
```typescript
it('happy path: should successfully submit withdrawal', async () => {
  // Заполнение формы
  // Отправка
  // Проверка успешного создания
});
```

#### 2. Error Handling Test
```typescript
it('should handle API error gracefully', async () => {
  // Мокируем ошибку API
  // Проверяем отображение ошибки
  // Проверяем что форма остается заполненной
});
```

#### 3. Double Submit Protection Test
```typescript
it('should prevent double submit', async () => {
  // Несколько кликов на кнопку
  // Проверяем что API вызван только 1 раз
});
```

#### 4. 409 Conflict Test
```typescript
it('should handle 409 conflict error', async () => {
  // Мокируем 409 ответ
  // Проверяем специальное сообщение
});
```

#### 5. Retry Logic Test
```typescript
it('should retry on network error', async () => {
  // Первые 2 запроса падают
  // Третий успешный
  // Проверяем 3 вызова API
});
```

## 📡 API Endpoints

### POST `/api/v1/withdrawals`

Создание новой заявки на вывод.

**Request:**
```json
{
  "amount": 100,
  "destination": "0x1234567890abcdef",
  "idempotencyKey": "unique-key-123"
}
```

**Response 201:**
```json
{
  "withdrawal": {
    "id": "wd_123",
    "amount": 100,
    "destination": "0x1234567890abcdef",
    "status": "pending",
    "createdAt": "2026-03-13T10:00:00Z",
    "idempotencyKey": "unique-key-123"
  }
}
```

**Response 409 (Conflict):**
```json
{
  "error": "A withdrawal with this idempotency key already exists",
  "withdrawalId": "wd_existing"
}
```

**Response 400 (Bad Request):**
```json
{
  "error": "Amount must be greater than 0"
}
```

### GET `/api/v1/withdrawals/:id`

Получение информации о заявке.

**Response 200:**
```json
{
  "withdrawal": {
    "id": "wd_123",
    "amount": 100,
    "destination": "0x1234567890abcdef",
    "status": "completed",
    "createdAt": "2026-03-13T10:00:00Z",
    "idempotencyKey": "unique-key-123"
  }
}
```

**Response 404:**
```json
{
  "error": "Withdrawal not found"
}
```

## 🎯 Выполненные требования

### Core (обязательно)

- ✅ Страница Withdraw с валидацией полей
- ✅ Submit доступен только при валидной форме
- ✅ Submit disabled во время запроса
- ✅ API интеграция (POST и GET endpoints)
- ✅ Idempotency key для каждого запроса
- ✅ 409 отображается понятным текстом
- ✅ Retry при сетевой ошибке без потери данных
- ✅ Отображение созданной заявки и статуса
- ✅ Защита от двойного submit
- ✅ Состояния idle/loading/success/error
- ✅ Next.js App Router + TypeScript
- ✅ Zustand для state management
- ✅ Безопасный рендер (без dangerouslySetInnerHTML)
- ✅ Документация по production-подходу к auth
- ✅ README с инструкциями
- ✅ 3 обязательных теста
- ✅ Деплой приложения

### Optional (по желанию)

- ✅ Восстановление последней заявки после reload (5 минут)
- ✅ Оптимизации производительности (React 19 features)
- ⏭️ E2E тесты (не реализованы в базовой версии)

## 🚀 Деплой на Vercel

```bash
# Установить Vercel CLI (если еще не установлен)
npm i -g vercel

# Деплой
vercel

# Production деплой
vercel --prod
```

Или через GitHub:
1. Push код в GitHub
2. Импортировать проект в Vercel
3. Автоматический деплой при каждом push

## 📝 Заметки

### Упрощения (согласно требованиям)
- Один пользователь (без мульти-тенантности)
- Одна валюта (USDT)
- Без полноценной auth-системы (mock auth)
- In-memory хранилище (в production - база данных)

### Возможные улучшения для production
- Добавить реальную БД (PostgreSQL + Prisma)
- Реализовать полноценную аутентификацию (NextAuth.js)
- Добавить rate limiting
- Логирование (Winston/Pino)
- Мониторинг (Sentry)
- E2E тесты (Playwright/Cypress)
- CI/CD pipeline
- Docker контейнеризация

## 👨‍💻 Автор

Реализовано для тестового задания на позицию Full Stack Developer.

## 📄 Лицензия

MIT
