import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import QRLandingClient from './QRLandingClient'
import type { QRResolution } from '@/lib/types/app.types'

interface Props {
  params: Promise<{ tableToken: string }>
}

async function resolveQR(tableToken: string) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('resolve_qr_token', { p_token: tableToken })
  return { data: data as (QRResolution & { error?: string }) | null, error }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tableToken } = await params
  const { data } = await resolveQR(tableToken)

  if (!data || data.error || !data.restaurant) {
    return { title: 'Invalid QR Code' }
  }

  return {
    title: `${data.restaurant.name} — Scan & Order`,
    description: `Browse the menu and place your order at ${data.restaurant.name}, ${data.branch.name}. Table ${data.table.table_number}.`,
  }
}

export default async function QRLandingPage({ params }: Props) {
  const { tableToken } = await params
  const { data, error } = await resolveQR(tableToken)

  if (error || !data || data.error) {
    notFound()
  }

  return <QRLandingClient resolution={data as QRResolution} tableToken={tableToken} />
}
