// ============================================================
// RestPilot — QR Code Utilities
// Generates cryptographically secure QR tokens and renders QR images
// ============================================================

import { customAlphabet } from 'nanoid'
import QRCode from 'qrcode'

// URL-safe characters only, no ambiguous chars (0, O, I, l)
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz', 12)

/**
 * Generate a cryptographically secure QR table token
 */
export function generateQRToken(): string {
  return nanoid()
}

/**
 * Build the customer-facing QR URL for a given token
 */
export function buildQRUrl(token: string, appUrl?: string): string {
  const base = appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.restpilot.com'
  return `${base}/t/${token}`
}

/**
 * Generate a QR code as a base64 data URL (for display/download)
 */
export async function generateQRDataUrl(
  token: string,
  options: {
    size?: number
    darkColor?: string
    lightColor?: string
    appUrl?: string
  } = {}
): Promise<string> {
  const url = buildQRUrl(token, options.appUrl)
  const { size = 300, darkColor = '#1A1A2E', lightColor = '#FFFFFF' } = options

  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'H', // High error correction for printed QR codes
  })
}

/**
 * Generate a QR code as SVG string
 */
export async function generateQRSvg(token: string, appUrl?: string): Promise<string> {
  const url = buildQRUrl(token, appUrl)
  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'H',
  })
}

/**
 * Download a QR code as PNG for a given token
 * (Client-side only)
 */
export async function downloadQRCode(
  token: string,
  fileName: string = 'qr-code',
  options?: Parameters<typeof generateQRDataUrl>[1]
): Promise<void> {
  const dataUrl = await generateQRDataUrl(token, options)
  const link = document.createElement('a')
  link.download = `${fileName}.png`
  link.href = dataUrl
  link.click()
}
