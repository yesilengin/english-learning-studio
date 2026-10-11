function mergePiece(base, piece) {
  if (!base) return piece
  if (!piece) return base
  const current = base.toLowerCase()
  const next = piece.toLowerCase()
  if (current === next || current.endsWith(` ${next}`)) return base
  if (next.startsWith(current) || next.includes(current)) return piece
  if (current.includes(next)) return base
  return `${base} ${piece}`
}

function undouble(text) {
  const words = text.split(' ').filter(Boolean)
  if (words.length < 4) return words.join(' ')

  for (let size = Math.floor(words.length / 2); size >= 2; size -= 1) {
    if (words.length % size !== 0) continue
    const times = words.length / size
    const unit = words.slice(0, size).map((word) => word.toLowerCase())
    let same = true
    for (let time = 1; time < times && same; time += 1) {
      for (let index = 0; index < size; index += 1) {
        if (words[time * size + index].toLowerCase() !== unit[index]) {
          same = false
          break
        }
      }
    }
    if (same) return words.slice(0, size).join(' ')
  }

  let doubled = 0
  for (let index = 1; index < words.length; index += 1) {
    if (words[index].toLowerCase() === words[index - 1].toLowerCase()) doubled += 1
  }
  if (doubled >= 2 && doubled * 2 >= words.length) {
    const kept = []
    for (const word of words) {
      if (kept.length && kept[kept.length - 1].toLowerCase() === word.toLowerCase()) continue
      kept.push(word)
    }
    return kept.join(' ')
  }

  return words.join(' ')
}

export function cleanHeard(resultList) {
  let text = ''
  const results = Array.from(resultList || [])
  for (const result of results) {
    const piece = String(result?.[0]?.transcript || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!piece) continue
    text = mergePiece(text, piece)
  }
  return undouble(text)
}
