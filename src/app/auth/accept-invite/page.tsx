import type { Metadata } from 'next'
import { Suspense } from 'react'
import AcceptInviteClient from './AcceptInviteClient'
import { validateInvitation } from '@/app/actions/invitation'

export const metadata: Metadata = {
  title: 'Accept Invitation — RestPilot',
  description: 'Accept your invitation to join a RestPilot restaurant.',
}

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams
  const token = params.token

  let inviteData = null
  let errorMsg = null

  if (!token) {
    errorMsg = 'No invitation token provided.'
  } else {
    try {
      inviteData = await validateInvitation(token)
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Invalid or expired invitation.'
    }
  }

  return (
    <Suspense fallback={
      <div className="customer-state-page">
        <div className="customer-spinner" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <AcceptInviteClient token={token || ''} inviteData={inviteData} errorMsg={errorMsg} />
    </Suspense>
  )
}
