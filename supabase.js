import{createClient}from `https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm`

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl,supabaseKEy)
