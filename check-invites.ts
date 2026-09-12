import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function checkInvitations() {
  const { data: policies, error } = await supabase.rpc('get_policies')
  console.log('Policies Error:', error)
  console.log('Policies:', policies)
  
  // Actually, we can just query pg_policies using the service role!
  const { data: pgPolicies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'invitations')
  console.log('pg_policies for invitations:', pgPolicies)
}

checkInvitations()
