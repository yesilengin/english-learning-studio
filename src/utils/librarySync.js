import { db, getSetting, updateSetting } from '../db'

const SAMPLE_TITLES = new Set(['Tom and His Dog', 'The Lost Cat', 'The Brave Soldier'])
let inflight = null

function sentenceCount(content) {
  return (String(content || '').match(/[^.!?]+[.!?]+/g) || []).length
}

async function deletedIds() {
  const value = await getSetting('deletedCloudIds')
  return Array.isArray(value) ? value : []
}

async function rememberDeleted(id) {
  const ids = await deletedIds()
  if (!ids.includes(id)) await updateSetting('deletedCloudIds', [...ids, id])
}

async function dropDeleted(id) {
  const ids = (await deletedIds()).filter((item) => item !== id)
  await updateSetting('deletedCloudIds', ids)
}

async function request(method, body) {
  try {
    const response = await fetch('/api/library', {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
    if (!response.ok) return { ok: false }
    if (method === 'GET') {
      const data = await response.json()
      return { ok: true, books: Array.isArray(data.books) ? data.books : [] }
    }
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

async function runSync() {
  const pendingDelete = await deletedIds()
  for (const id of pendingDelete) {
    const removed = await request('DELETE', { id })
    if (removed.ok) await dropDeleted(id)
  }

  const remote = await request('GET')
  if (!remote.ok) return { ok: false }

  const blocked = new Set(await deletedIds())
  let remoteIds = new Set(remote.books.map((book) => book.id))
  const local = await db.books.toArray()

  for (const book of local) {
    if (SAMPLE_TITLES.has(book.title)) continue
    if (!book.content?.trim()) continue
    if (book.cloudId && blocked.has(book.cloudId)) continue
    if (book.synced && book.cloudId && remoteIds.has(book.cloudId)) continue

    const id = book.cloudId || crypto.randomUUID()
    if (book.cloudId !== id) await db.books.update(book.id, { cloudId: id })
    const saved = await request('POST', { id, title: book.title, content: book.content })
    if (!saved.ok) return { ok: false }
    await db.books.update(book.id, { cloudId: id, synced: true })
    remoteIds.add(id)
  }

  const again = await request('GET')
  if (!again.ok) return { ok: true }

  const latest = again.books.filter((book) => book?.id && book.title && book.content && !blocked.has(book.id))
  const latestIds = new Set(latest.map((book) => book.id))
  const current = await db.books.toArray()

  for (const book of latest) {
    if (current.some((item) => item.cloudId === book.id)) continue
    await db.books.add({
      cloudId: book.id,
      title: book.title,
      content: book.content,
      language: 'en-US',
      uploadDate: book.updatedAt || new Date(),
      lastReadPosition: 0,
      totalSentences: sentenceCount(book.content),
      progress: 0,
      synced: true
    })
  }

  for (const book of current) {
    if (SAMPLE_TITLES.has(book.title) || !book.synced || !book.cloudId) continue
    if (!latestIds.has(book.cloudId)) await db.books.delete(book.id)
  }

  return { ok: true }
}

export function syncBooks() {
  if (!navigator.onLine) return Promise.resolve({ ok: false })
  if (!inflight) inflight = runSync().finally(() => { inflight = null })
  return inflight
}

export async function forgetSharedBook(cloudId) {
  if (!cloudId) return true
  await rememberDeleted(cloudId)
  const removed = await request('DELETE', { id: cloudId })
  if (removed.ok) await dropDeleted(cloudId)
  return true
}
