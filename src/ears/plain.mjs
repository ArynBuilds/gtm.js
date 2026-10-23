const whole = word => new RegExp(`(^|[^a-z0-9])${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`)

// Cheap sorting before the costly reading. A post is worth reading when it
// is about one of our topics AND sounds like a person asking or struggling,
// and does not open like an advert. Returns the topic it matched, or nothing.
export function worth(settings, title, text) {
  if (!asking(settings, title, text)) return
  const all = `${title} ${text}`.toLowerCase()
  return settings.topics.find(t => whole(t).test(all))
}

// The half of the test that has nothing to do with our topics: a person
// asking or struggling, not an advert. The wider stream uses this alone.
export function asking({ signals, adverts }, title, text) {
  const all = `${title} ${text}`.toLowerCase()
  if (adverts.some(a => whole(a).test(all.slice(0, 200)))) return false
  return signals.some(s => s === '?' ? all.includes('?') : whole(s).test(all))
}

const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export const entities = text => text
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&(\w+);/g, (whole, name) => named[name] ?? whole)

// Markup in, readable text out.
export function plain(html) {
  return entities(html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(p|br|li)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
