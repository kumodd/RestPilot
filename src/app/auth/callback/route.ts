import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  // RestPilot does not authenticate through magic links or callback codes.
  // A user must request and verify a six-digit email OTP on /auth/login.
  return NextResponse.redirect(`${origin}/auth/login?error=otp_required`)
}
