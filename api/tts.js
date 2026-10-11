function pieces(text) {
  const words = text.split(' ').filter(Boolean)
  const parts = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > 180 && current) {
      parts.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) parts.push(current)
  return parts
}

async function fetchMp3(text) {
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=${encodeURIComponent(text)}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/'
    }
  })

  if (!response.ok) {
    throw new Error(`tts ${response.status}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 200) {
    throw new Error('empty audio')
  }
  return bytes
}

export default async function handler(req, res) {
  const text = String(req.query.text || '').replace(/\s+/g, ' ').trim().slice(0, 900)
  if (!text) {
    res.status(400).send('missing text')
    return
  }

  try {
    const buffers = []
    for (const part of pieces(text)) {
      buffers.push(await fetchMp3(part))
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.status(200).send(Buffer.concat(buffers))
  } catch (error) {
    console.error(error)
    res.status(502).send('audio unavailable')
  }
}
