const MAX_SENTENCES = 4
const MAX_WORDS = 110

export function buildPages(sentences) {
  if (!sentences.length) return []
  const pages = []
  let indexes = []
  let words = 0

  sentences.forEach((sentence, index) => {
    const count = String(sentence || '').split(/\s+/).filter(Boolean).length || 1
    const full = indexes.length >= MAX_SENTENCES || (indexes.length > 0 && words + count > MAX_WORDS)
    if (full) {
      pages.push(indexes)
      indexes = []
      words = 0
    }
    indexes.push(index)
    words += count
  })

  if (indexes.length) pages.push(indexes)
  return pages
}

export function pageNumberFor(pages, sentenceIndex) {
  const found = pages.findIndex((page) => page.includes(sentenceIndex))
  return found < 0 ? 0 : found
}
