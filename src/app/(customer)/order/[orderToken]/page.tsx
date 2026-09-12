import type { Metadata } from 'next'
import OrderTrackingClient from './OrderTrackingClient'

export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Real-time order status tracking for your restaurant order.',
}

interface Props {
  params: Promise<{ orderToken: string }>
}

export default async function OrderTrackingPage({ params }: Props) {
  const { orderToken } = await params
  return <OrderTrackingClient orderToken={orderToken} />
}
