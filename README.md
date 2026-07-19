# Тренажёр ЕНТ · Математическая грамотность

Веб-приложение для подготовки школьников: тренировка с мгновенной проверкой,
пробный ЕНТ с таймером, личный прогресс ученика, админка учителя со статистикой.

**Стек:** Vite + React 19 + React Router 7 + Tailwind CSS v4 + Supabase (Postgres, Auth, RLS).

## Запуск локально

```bash
npm install
npm run dev        # http://localhost:5173
```

Ключи Supabase лежат в `.env.local` (не коммитится):

```
VITE_SUPABASE_URL=https://cmadircekbtsikzzzvdj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-ключ из Project Settings → API>
```

## База данных

- Проект Supabase: `ent-trainer` (регион eu-central-1).
- Схема: [`supabase/schema.sql`](supabase/schema.sql) — выполняется один раз в SQL Editor.
  Таблицы: `profiles` (роль student/teacher), `questions`, `attempts`, `exams` + RLS-политики.
- Пароль БД: `supabase/.db-password` (не коммитится, нужен только для прямого доступа к Postgres).

### Сделать пользователя учителем

После того как человек зарегистрировался на сайте:

```sql
update public.profiles set role = 'teacher'
where id = (select id from auth.users where email = 'ПОЧТА');
```

(Supabase → SQL Editor). Учитель видит админку вместо ученических разделов.

## Деплой (GitHub Pages)

Сайт живёт в репозитории `exeslam/ent-trainer`, ветка `gh-pages`, адрес
https://exeslam.github.io/ent-trainer/

```bash
npm run build
cp dist/index.html dist/404.html   # SPA-fallback для Pages
cd dist
git init -b gh-pages && git add -A && git commit -m "deploy"
git push -f https://github.com/exeslam/ent-trainer.git gh-pages
```

`base: '/ent-trainer/'` задан в `vite.config.js`; роутер берёт basename из `import.meta.env.BASE_URL`.

## Тестовые аккаунты

| Роль    | Почта                       | Пароль     |
|---------|-----------------------------|------------|
| Ученик  | student-test@enttrainer.kz  | student123 |
| Учитель | teacher-test@enttrainer.kz  | teacher123 |

Перед передачей заказчице: зарегистрировать её настоящий аккаунт, выдать роль учителя,
тестовые аккаунты можно удалить в Supabase → Authentication → Users.
