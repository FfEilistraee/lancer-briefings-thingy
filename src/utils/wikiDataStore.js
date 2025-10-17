import { slugify, transformWikiImages, transformWikiLinks } from '@/utils/wiki'

let cachedData = null
let loadPromise = null

function labelize(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w|\s\w/g, c => c.toUpperCase())
}

function normalizeArray(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  return String(val)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function parseFrontMatter(raw) {
  if (!raw.startsWith('---')) return { data: null, content: raw }
  const end = raw.indexOf('\n---')
  if (end === -1) return { data: null, content: raw }
  const fm = raw.slice(3, end).trim()
  const content = raw.slice(end + 4).replace(/^\s*\n/, '')

  const data = {}
  const lines = fm.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!m) {
      i++
      continue
    }
    const key = m[1]
    let val = m[2].trim()

    if (val === '') {
      const arr = []
      let j = i + 1
      while (j < lines.length) {
        const li = lines[j]
        const t = li.trim()
        if (t.startsWith('- ')) {
          arr.push(t.slice(2).trim())
          j++
          continue
        }
        if (li.startsWith('  ') || li.startsWith('\t')) {
          j++
          continue
        }
        break
      }
      if (arr.length) {
        data[key] = arr
        i = j
        continue
      }
    }

    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim()
      data[key] = inner
        ? inner
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : []
      i++
      continue
    }

    if (val.includes(',') && !(val.startsWith('"') || val.startsWith("'"))) {
      data[key] = val
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      i++
      continue
    }

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }

    data[key] = val
    i++
  }

  return { data, content }
}

function extractInfobox(md, meta) {
  const lines = md.split('\n')
  const out = []
  let i = 0
  const collected = []
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('> [!infobox]')) {
      i++
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        collected.push(lines[i])
        i++
      }
      continue
    }
    out.push(line)
    i++
  }
  const kv = {}
  collected.forEach(l => {
    const t = l.replace(/^>\s?/, '')
    if (/^!\[\[/.test(t)) {
      const m = t.match(/^!\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/)
      if (m) kv.__thumbnail = `/world/${m[1]}`
      return
    }
    if (t.includes('|')) {
      const parts = t
        .split('|')
        .map(s => s.trim())
        .filter(Boolean)
      if (parts.length === 2 && !/^[-]+$/.test(parts[0])) {
        const key = slugify(parts[0]).replace(/-/g, ' ')
        const label = key.replace(/\b\w/g, c => c.toUpperCase())
        kv[label.toLowerCase()] = parts[1]
      }
    }
  })
  const merged = { ...meta }
  const map = {
    'other names': 'aliases',
    gender: 'gender',
    race: 'race',
    age: 'age',
    height: 'height',
    origin: 'origin',
    ethnicity: 'ethnicity',
    occupation: 'occupation',
    title: 'title',
    languages: 'languages',
    status: 'status',
    affiliations: 'affiliations',
    location: 'location',
  }
  Object.entries(map).forEach(([from, to]) => {
    if (kv[from] !== undefined) {
      merged[to] = /,/.test(kv[from])
        ? kv[from]
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : kv[from]
    }
  })
  if (kv.__thumbnail && !merged.thumbnail) merged.thumbnail = kv.__thumbnail
  return { content: out.join('\n'), meta: merged }
}

function detectCategory(sourcePath, type) {
  const lowerType = String(type || '').toLowerCase()
  if (/world\/terms\//i.test(sourcePath) || lowerType === 'term' || lowerType.includes('codex')) return 'codex'
  if (/world\/factions\//i.test(sourcePath) || lowerType.includes('faction') || lowerType.includes('power')) return 'power'
  if (/world\/planets\//i.test(sourcePath) || lowerType.includes('world') || lowerType.includes('planet')) return 'world'
  if (/world\/stations\//i.test(sourcePath) || lowerType.includes('gate') || lowerType.includes('station')) return 'gate'
  return 'people'
}

function extractSummary(entry) {
  if (entry.summary) return Array.isArray(entry.summary) ? entry.summary.join(' ') : String(entry.summary)
  if (entry.tooltip)
    return Array.isArray(entry.tooltip) ? entry.tooltip.join(' ') : String(entry.tooltip)
  const raw = entry.content || ''
  const stripped = raw.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/[#>*_`]/g, '')
  const sentence = stripped
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)[0] || ''
  return sentence.slice(0, 220) + (sentence.length > 220 ? '…' : '')
}

function buildQuickFacts(entry) {
  const quick = []
  const fields = entry.tooltipFacts || entry.infobox || null
  if (Array.isArray(fields)) {
    fields.forEach(f => {
      if (f && typeof f === 'string') {
        const [label, ...rest] = f.split(':')
        if (label && rest.length) quick.push({ label: label.trim(), value: rest.join(':').trim() })
      } else if (f && f.label && f.value) {
        quick.push({ label: f.label, value: f.value })
      }
    })
    if (quick.length) return quick
  } else if (fields && typeof fields === 'string') {
    const parts = fields
      .split('|')
      .map(s => s.trim())
      .filter(Boolean)
    parts.forEach(part => {
      const [label, ...rest] = part.split(':')
      if (label && rest.length) quick.push({ label: label.trim(), value: rest.join(':').trim() })
    })
    if (quick.length) return quick
  }
  const candidates = ['role', 'rank', 'affiliations', 'location', 'status']
  candidates.forEach(key => {
    if (entry[key]) {
      const value = Array.isArray(entry[key]) ? entry[key].join(', ') : entry[key]
      quick.push({ label: labelize(key), value })
    }
  })
  return quick
}

function postProcessEntry(entry) {
  const category = detectCategory(entry.sourcePath || '', entry.type)
  const summary = extractSummary(entry)
  const quickFacts = buildQuickFacts(entry)
  return {
    ...entry,
    category,
    summary,
    quickFacts,
  }
}

async function loadWikiData() {
  const entries = []
  const codexEntries = []
  const modules = {
    ...import.meta.glob('@/assets/world/**/*.md', { query: '?raw', import: 'default' }),
    ...import.meta.glob('/src/assets/world/**/*.md', { query: '?raw', import: 'default' }),
    ...import.meta.glob('/assets/world/**/*.md', { query: '?raw', import: 'default' }),
  }
  const fileEntries = Object.entries(modules)
  const loaded = await Promise.all(
    fileEntries.map(([path, loader]) => loader().then(mod => ({ path, mod })))
  )

  const seen = new Set()
  const slugSeen = new Set()

  loaded.forEach(({ path, mod }) => {
    if (seen.has(path)) return
    seen.add(path)

    const raw = typeof mod === 'string' ? mod : mod.default

    let data = null
    let body = raw
    if (raw.startsWith('---')) {
      const fm = parseFrontMatter(raw)
      data = fm.data
      body = fm.content
    }

    body = transformWikiImages(body)
    body = transformWikiLinks(body)
    const inf = extractInfobox(body, data || {})
    body = inf.content
    const meta = inf.meta || {}

    let entry
    if (meta && (meta.name || meta.slug)) {
      entry = {
        slug: meta.slug || slugify(meta.name),
        name: meta.name || 'Untitled',
        type: meta.type || 'NPC',
        tags: normalizeArray(meta.tags),
        thumbnail: meta.thumbnail || '',
        content: body || '',
        sourcePath: path,
        ...Object.fromEntries(
          Object.entries(meta).filter(([k]) => !['slug', 'name', 'type', 'tags', 'thumbnail'].includes(k))
        ),
      }
    } else {
      const lines = (raw || '').split('\n')
      entry = {
        slug: (lines[0] || '').trim(),
        name: (lines[1] || '').trim(),
        type: (lines[2] || 'NPC').trim(),
        tags: (lines[3] || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        thumbnail: (lines[4] || '').trim(),
        content: lines.slice(5).join('\n'),
        sourcePath: path,
      }
    }

    const processed = postProcessEntry(entry)
    const isDraft = typeof processed.draft === 'string' ? processed.draft.toLowerCase() === 'true' : !!processed.draft
    if (isDraft) return
    if (!processed.slug || slugSeen.has(processed.slug)) return
    slugSeen.add(processed.slug)

    if (processed.category === 'codex') {
      codexEntries.push(processed)
    } else {
      entries.push(processed)
    }
  })

  entries.sort((a, b) => a.name.localeCompare(b.name))
  codexEntries.sort((a, b) => a.name.localeCompare(b.name))

  const slugIndex = {}
  entries.forEach(entry => {
    if (entry.slug) slugIndex[entry.slug] = entry
  })
  codexEntries.forEach(entry => {
    if (entry.slug) slugIndex[entry.slug] = entry
  })

  return { entries, codexEntries, slugIndex }
}

export async function ensureWikiData() {
  if (cachedData) return cachedData
  if (!loadPromise) {
    loadPromise = loadWikiData().then(result => {
      cachedData = result
      return cachedData
    })
  }
  return loadPromise
}

export async function getWikiEntry(slug) {
  if (!slug) return null
  const { slugIndex } = await ensureWikiData()
  return slugIndex[slug] || null
}

export function getCachedWikiEntry(slug) {
  if (!slug || !cachedData) return null
  return cachedData.slugIndex[slug] || null
}

export { labelize }
