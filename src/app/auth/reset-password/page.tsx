import type { Metadata } from 'next'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Email Code — RestPilot',
  description: 'Sign in to RestPilot with an email verification code.',
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
