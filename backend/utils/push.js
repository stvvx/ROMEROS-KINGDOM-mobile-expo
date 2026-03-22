// Lightweight Expo push helper using fetch. Requires expo push tokens on user records.
const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch')

async function sendExpoPush(tokens = [], payload = {}) {
  if (!tokens.length) return { success: false, reason: 'NO_TOKENS' }

  const uniqueTokens = [...new Set(tokens)]
  const validTokens = uniqueTokens.filter(
    token => typeof token === 'string' && /^Expo(nent)?PushToken\[/.test(token)
  )

  if (!validTokens.length) {
    console.warn('[push] No valid Expo push tokens to send')
    return { success: false, reason: 'NO_VALID_TOKENS' }
  }

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    ...payload,
  }))

  try {
    const res = await fetchFn('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('[push] Expo push failed', res.status, txt)
      return { success: false, reason: 'HTTP_ERROR', status: res.status, body: txt }
    }

    const data = await res.json().catch(() => null)
    const ticketErrors = Array.isArray(data?.data)
      ? data.data.filter(t => t?.status === 'error').map(t => t?.message || t?.details || 'Unknown ticket error')
      : []

    if (ticketErrors.length) {
      console.error('[push] Expo push ticket errors', ticketErrors)
      return { success: false, reason: 'TICKET_ERRORS', errors: ticketErrors }
    }

    return { success: true, sent: validTokens.length }
  } catch (err) {
    console.error('[push] Error sending push', err)
    return { success: false, reason: 'EXCEPTION', error: err?.message || String(err) }
  }
}

module.exports = { sendExpoPush }