import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/admin/AdminNav'
import type { Profile } from '@/lib/types/app.types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/admin')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as Profile | null

  if (!profile || profile.role !== 'platform_admin') {
    redirect('/dashboard')
  }

  return (
    <div className="dashboard-layout">
      <AdminNav profile={profile} user={user} />
      <div className="dashboard-main">{children}</div>
    </div>
  )
}
