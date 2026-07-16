// Fill these in from your Supabase project settings (Project Settings > API).
// The anon key is safe to expose in frontend code — access is controlled by
// Row Level Security policies (see supabase/migrations/0001_init_schema.sql),
// which only allow logged-in users to read/write.
const SUPABASE_URL = "https://qcaoubecasolifelhhdk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FZeTczwqmzSrM4gWb8WY3w_tUZ8VWol";

// Paste the "Secret address in iCal format" or the embeddable calendar ID
// from Google Calendar > Settings > [Violin Studio calendar] > Integrate calendar.
const GOOGLE_CALENDAR_EMBED_ID = "438ecd151ac075dc8acecda6597fdb44940246ebddcf55a625888bc126c915e8@group.calendar.google.com";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
