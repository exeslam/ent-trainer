import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabase = Boolean(url && anon)

if (!hasSupabase) {
  // Подсказка в консоли, если ключи ещё не заданы.
  console.warn(
    'Supabase не настроен. Скопируйте .env.example → .env.local и заполните ' +
    'VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (Supabase → Project Settings → API).'
  )
}

// Заглушки, чтобы приложение не падало до настройки ключей (hasSupabase === false).
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anon || 'placeholder-anon-key',
)
