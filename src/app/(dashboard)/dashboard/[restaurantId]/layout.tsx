import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantId: string }>
}) {
  const { restaurantId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Validate user has access to this restaurant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hasAccess, error } = await (supabase.rpc as any)('has_restaurant_access', { p_restaurant_id: restaurantId })
  if (error) console.error('Access check error:', error)

  if (!hasAccess) {
    redirect('/dashboard') // Redirect to global dashboard if they try to access a restaurant they don't own/work at
  }

  return <>{children}</>
}
