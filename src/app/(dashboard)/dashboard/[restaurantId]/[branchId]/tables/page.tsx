import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TablesPageClient from './TablesPageClient'

export const metadata: Metadata = {
  title: 'Tables & QR Codes — RestPilot',
}

interface TableRow {
  id: string
  table_number: string
  display_name: string | null
  capacity: number | null
  status: string
  floor: string | null
  section: string | null
  is_active: boolean
  qr_codes: Array<{
    id: string
    token: string
    is_active: boolean
    scan_count: number
    last_scanned_at: string | null
  }>
}

export default async function TablesPage({ params }: { params: Promise<{ restaurantId: string; branchId: string }> }) {
  const { restaurantId, branchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch tables with QR codes ONLY for this branch
  const { data: tablesRaw } = await supabase
    .from('restaurant_tables')
    .select(`
      id, table_number, display_name, capacity, status, floor, section, is_active,
      qr_codes(id, token, is_active, scan_count, last_scanned_at)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('branch_id', branchId)
    .order('table_number', { ascending: true })

  // Fetch branches for context (just in case Client needs it, though it's locked to URL)
  const { data: branchesRaw } = await supabase
    .from('branches')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)

  return (
    <TablesPageClient
      tables={(tablesRaw as unknown as TableRow[]) ?? []}
      branches={(branchesRaw as Array<{ id: string; name: string }>) ?? []}
      restaurantId={restaurantId}
      currentBranchId={branchId}
    />
  )
}

