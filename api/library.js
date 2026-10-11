import { BlobNotFoundError, get, put } from '@vercel/blob'

const PATH = 'library/books.json'

async function readBooks() {
  try {
    const result = await get(PATH, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return []
    const text = await new Response(result.stream).text()
    const data = JSON.parse(text)
    return Array.isArray(data.books) ? data.books : []
  } catch (error) {
    if (error instanceof BlobNotFoundError || error?.statusCode === 404) return []
    throw error
  }
}

async function writeBooks(books) {
  await put(PATH, JSON.stringify({ books }), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  })
}

function readBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  return req.body
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      res.status(200).json({ books: await readBooks() })
      return
    }

    const body = readBody(req)

    if (req.method === 'POST') {
      const id = String(body.id || '')
      const title = String(body.title || '').trim()
      const content = String(body.content || '')
      if (!/^[0-9a-f-]{16,80}$/i.test(id) || !title || !content.trim()) {
        res.status(400).json({ error: 'Eksik kitap' })
        return
      }
      if (content.length > 3500000) {
        res.status(413).json({ error: 'Kitap çok büyük' })
        return
      }
      const books = (await readBooks()).filter((book) => book.id !== id)
      books.push({ id, title, content, updatedAt: new Date().toISOString() })
      await writeBooks(books)
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'DELETE') {
      const id = String(body.id || '')
      const books = (await readBooks()).filter((book) => book.id !== id)
      await writeBooks(books)
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Yöntem yok' })
  } catch (error) {
    console.error('library', error)
    res.status(503).json({ error: 'Kitaplık şu an paylaşılamıyor' })
  }
}
