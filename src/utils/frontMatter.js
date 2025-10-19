const PRIMARY_ORDER = [
  'draft',
  'slug',
  'name',
  'type',
  'tags',
  'thumbnail',
  'summary',
  'aliases',
  'pronouns',
  'gender',
  'species',
  'age',
  'height',
  'origin',
  'ethnicity',
  'occupation',
  'role',
  'languages',
  'status',
  'affiliations',
  'location',
  'quickFacts',
]

const QUICK_FACT_ORDER = ['label', 'value', 'date', 'year', 'title', 'description']

export function parseFrontMatter(raw) {
  if (!raw || !raw.startsWith('---')) return { data: null, content: raw }
  const endIndex = raw.indexOf('\n---', 3)
  if (endIndex === -1) return { data: null, content: raw }
  const fmRaw = raw.slice(3, endIndex).replace(/^\n+|\n+$/g, '')
  const content = raw.slice(endIndex + 4).replace(/^\s*\n/, '')
  const lines = fmRaw.split(/\r?\n/)
  const { value: data } = parseBlock(lines, 0, 0)
  return { data, content }
}

export function stringifyFrontMatter(data = {}) {
  const sanitized = sanitizeData(data)
  const lines = ['---']
  serializeObject(sanitized, 0, lines)
  lines.push('---')
  return lines.join('\n')
}

function sanitizeData(data) {
  if (!data || typeof data !== 'object') return {}
  const clone = {}
  Object.keys(data).forEach(key => {
    const value = data[key]
    if (value === undefined || value === null) return
    clone[key] = sanitizeValue(value)
  })
  return clone
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeValue(item))
      .filter(item =>
        item !== undefined &&
        item !== null &&
        !(typeof item === 'string' && item.trim() === '') &&
        !(typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0)
      )
  }
  if (value && typeof value === 'object') {
    const obj = {}
    Object.keys(value).forEach(key => {
      const val = sanitizeValue(value[key])
      if (val === undefined || val === null) return
      if (typeof val === 'string' && val.trim() === '') return
      if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return
      obj[key] = val
    })
    return obj
  }
  return value
}

function parseBlock(lines, indent, index) {
  const result = {}
  let i = index
  while (i < lines.length) {
    const line = lines[i]
    if (!line || !line.trim() || line.trim().startsWith('#')) {
      i++
      continue
    }
    const currentIndent = countIndent(line)
    if (currentIndent < indent) break
    if (currentIndent > indent) {
      i++
      continue
    }
    const trimmed = line.trim()
    if (trimmed.startsWith('-')) {
      const { items, nextIndex } = parseList(lines, indent, i)
      return { value: items, nextIndex }
    }
    const { key, value } = splitKeyValue(trimmed)
    if (!key) {
      i++
      continue
    }
    if (value === '>' || value === '|') {
      const { text, nextIndex } = readMultiline(lines, i + 1, indent + 2)
      result[key] = text
      i = nextIndex
      continue
    }
    if (value === '') {
      const nextLine = lines[i + 1]
      if (!nextLine) {
        result[key] = ''
        i++
        continue
      }
      const nextIndent = countIndent(nextLine)
      if (nextIndent <= indent) {
        result[key] = ''
        i++
        continue
      }
      if (nextLine.trim().startsWith('-')) {
        const { items, nextIndex } = parseList(lines, nextIndent, i + 1)
        result[key] = items
        i = nextIndex
        continue
      }
      const { value: nested, nextIndex } = parseBlock(lines, indent + 2, i + 1)
      result[key] = nested
      i = nextIndex
      continue
    }
    result[key] = parseScalar(value)
    i++
  }
  return { value: result, nextIndex: i }
}

function parseList(lines, indent, index) {
  const items = []
  let i = index
  while (i < lines.length) {
    const line = lines[i]
    if (!line || !line.trim()) {
      i++
      continue
    }
    const currentIndent = countIndent(line)
    if (currentIndent < indent) break
    const trimmed = line.trim()
    if (!trimmed.startsWith('-')) break
    const afterDash = trimmed.slice(1).trim()
    if (!afterDash) {
      const { value, nextIndex } = parseBlock(lines, currentIndent + 2, i + 1)
      items.push(value)
      i = nextIndex
      continue
    }
    if (!afterDash.includes(':')) {
      items.push(parseScalar(afterDash))
      i++
      continue
    }
    const { key, value } = splitKeyValue(afterDash)
    const obj = {}
    if (value === '>' || value === '|') {
      const { text, nextIndex } = readMultiline(lines, i + 1, currentIndent + 2)
      obj[key] = text
      i = nextIndex
    } else if (value === '') {
      obj[key] = ''
      i++
    } else {
      obj[key] = parseScalar(value)
      i++
    }
    while (i < lines.length) {
      const nextLine = lines[i]
      if (!nextLine || !nextLine.trim()) {
        i++
        continue
      }
      const nextIndent = countIndent(nextLine)
      if (nextIndent <= currentIndent) break
      const trimmedNext = nextLine.trim()
      if (trimmedNext.startsWith('-')) {
        const { items: nestedList, nextIndex } = parseList(lines, nextIndent, i)
        obj[key] = Array.isArray(obj[key]) ? obj[key].concat(nestedList) : nestedList
        i = nextIndex
        continue
      }
      const { key: childKey, value: childValue } = splitKeyValue(trimmedNext)
      if (!childKey) {
        i++
        continue
      }
      if (childValue === '>' || childValue === '|') {
        const { text, nextIndex } = readMultiline(lines, i + 1, nextIndent + 2)
        obj[childKey] = text
        i = nextIndex
        continue
      }
      if (childValue === '') {
        const { value: nested, nextIndex } = parseBlock(lines, nextIndent + 2, i + 1)
        obj[childKey] = nested
        i = nextIndex
        continue
      }
      obj[childKey] = parseScalar(childValue)
      i++
    }
    items.push(obj)
  }
  return { items, nextIndex: i }
}

function readMultiline(lines, index, indent) {
  const collected = []
  let i = index
  while (i < lines.length) {
    const line = lines[i]
    if (line === undefined) break
    const trimmed = line.trim()
    const currentIndent = countIndent(line)
    if (!trimmed) {
      collected.push('')
      i++
      continue
    }
    if (currentIndent < indent) break
    collected.push(line.slice(indent))
    i++
  }
  const text = collected.join('\n').replace(/\s+$/, '')
  return { text, nextIndex: i }
}

function serializeObject(obj, indent, lines) {
  const keys = orderKeys(obj)
  keys.forEach(key => {
    const value = obj[key]
    if (value === undefined || value === null) return
    writeEntry(key, value, indent, lines)
  })
}

function writeEntry(key, value, indent, lines) {
  const prefix = spaces(indent)
  if (Array.isArray(value)) {
    if (!value.length) return
    lines.push(`${prefix}${key}:`)
    value.forEach(item => writeListItem(item, indent + 2, lines))
    return
  }
  if (value && typeof value === 'object') {
    const nestedKeys = Object.keys(value)
    if (!nestedKeys.length) return
    lines.push(`${prefix}${key}:`)
    serializeObject(value, indent + 2, lines)
    return
  }
  if (typeof value === 'string' && value.includes('\n')) {
    lines.push(`${prefix}${key}: >`)
    value.split(/\n/).forEach(line => {
      lines.push(`${spaces(indent + 2)}${line}`)
    })
    return
  }
  lines.push(`${prefix}${key}: ${formatScalar(value)}`)
}

function writeListItem(item, indent, lines) {
  const prefix = spaces(indent)
  if (Array.isArray(item)) {
    if (!item.length) return
    lines.push(`${prefix}-`)
    item.forEach(child => writeListItem(child, indent + 2, lines))
    return
  }
  if (item && typeof item === 'object') {
    const keys = orderListItemKeys(item)
    if (!keys.length) return
    const inlineKey = keys[0]
    const inlineValue = item[inlineKey]
    const canInline = isInlineValue(inlineValue) && keys.length === 1
    if (canInline) {
      lines.push(`${prefix}- ${inlineKey}: ${formatScalar(inlineValue)}`)
      return
    }
    lines.push(`${prefix}-`)
    keys.forEach(key => {
      writeEntry(key, item[key], indent + 2, lines)
    })
    return
  }
  if (typeof item === 'string' && item.includes('\n')) {
    lines.push(`${prefix}- |`)
    item.split(/\n/).forEach(line => {
      lines.push(`${spaces(indent + 2)}${line}`)
    })
    return
  }
  lines.push(`${prefix}- ${formatScalar(item)}`)
}

function orderKeys(obj) {
  const keys = Object.keys(obj)
  const ordered = []
  PRIMARY_ORDER.forEach(key => {
    if (keys.includes(key)) ordered.push(key)
  })
  keys
    .filter(key => !PRIMARY_ORDER.includes(key))
    .sort((a, b) => a.localeCompare(b))
    .forEach(key => ordered.push(key))
  return ordered
}

function orderListItemKeys(obj) {
  const keys = Object.keys(obj)
  const ordered = []
  QUICK_FACT_ORDER.forEach(key => {
    if (keys.includes(key)) ordered.push(key)
  })
  keys
    .filter(key => !QUICK_FACT_ORDER.includes(key))
    .sort((a, b) => a.localeCompare(b))
    .forEach(key => ordered.push(key))
  return ordered
}

function splitKeyValue(line) {
  const idx = line.indexOf(':')
  if (idx === -1) return { key: line.trim(), value: '' }
  const key = line.slice(0, idx).trim()
  const value = line.slice(idx + 1).trim()
  return { key, value }
}

function parseScalar(value) {
  if (value === null || value === undefined) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true'
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed)
    return Number.isNaN(num) ? trimmed : num
  }
  return trimmed
}

function formatScalar(value) {
  if (value === null || value === undefined) return '""'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '""'
  const text = String(value)
  if (text === '') return '""'
  if (/[:#\-]|^\s|\s$|\n|"/.test(text)) {
    return '"' + text.replace(/"/g, '\\"') + '"'
  }
  return text
}

function isInlineValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') {
    if (!value) return false
    return !value.includes('\n')
  }
  if (typeof value === 'number' || typeof value === 'boolean') return true
  return false
}

function countIndent(line) {
  let count = 0
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === ' ') count += 1
    else if (char === '\t') count += 2
    else break
  }
  return count
}

function spaces(count) {
  return ' '.repeat(Math.max(0, count))
}

