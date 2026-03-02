// Lightweight Expo push helper using fetch. Requires expo push tokens on user records.
const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch')

async function sendExpoPush(tokens = [], payload = {}) {
  if (!tokens.length) return

  const messages = tokens.map(token => ({
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
    }
  } catch (err) {
    console.error('[push] Error sending push', err)
  }
}

module.exports = { sendExpoPush }