import type { Metadata } from 'next'
import UpdatePasswordClient from './UpdatePasswordClient'

export const metadata: Metadata = {
  title: 'Email Authentication — RestPilot',
  description: 'RestPilot uses email verification codes for authentication.',
}

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient />
}
