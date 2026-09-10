import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://izwluavldyqtrwkqnpdl.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_z5-lZWeljjTFxM32yxYhUQ_D2x7l84Z'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
