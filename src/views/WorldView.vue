<template>
  <div id="worldView" :class="{ animate: props.animate }" class="content-container">
    <!-- LIST / GLOSSARY -->
    <section id="world" class="section-container">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/npc.svg" />
        <h1>WORLD</h1>
      </div>

      <div class="section-content-container">
        <!-- Simple filters -->
        <div style="display:flex; gap:12px; margin-bottom:12px; align-items:center">
          <input v-model="query" type="text" placeholder="Search NPCs, factions, places…" style="flex:1; padding:6px 10px; background:var(--secondary-color); border:1px solid var(--primary-color); color:var(--text-color)" />
          <select v-model="typeFilter" style="padding:6px 10px; background:var(--secondary-color); border:1px solid var(--primary-color); color:var(--text-color)">
            <option value="">All Types</option>
            <option>NPC</option>
            <option>Faction</option>
            <option>Location</option>
            <option>Term</option>
            <option>Item</option>
          </select>
        </div>

        <div class="events-list-container" style="overflow:auto">
          <WorldEntry
            v-for="entry in filteredEntries"
            :key="entry.slug"
            :entry="entry"
            :animate="props.animate"
            @select-entry="selectEntry"
          />
        </div>
      </div>
    </section>

    <!-- DETAILS / ARTICLE -->
    <section v-if="selectedEntry" id="world-detail" class="section-container">
      <div class="section-header clipped-medium-backward-events-logs">
        <img src="/icons/conversation.svg" />
        <h1>ENTRY</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container extra-margins">
        <div class="wiki-article">
          <!-- InfoBox (right side like Wikipedia) -->
          <aside class="infobox">
            <img class="infobox-image" :src="selectedEntry.thumbnail || '/icons/portrait.svg'" alt="thumbnail" />
            <table class="infobox-table">
              <tbody>
                <tr v-for="row in infoboxRows" :key="row.label">
                  <th class="infobox-label">{{ row.label }}</th>
                  <td class="infobox-value">
                    <template v-if="Array.isArray(row.value)">
                      <span v-for="(v,i) in row.value" :key="i">
                        <a href="#" @click.prevent="query = String(v)">{{ v }}</a><span v-if="i < row.value.length - 1">, </span>
                      </span>
                    </template>
                    <template v-else>{{ row.value }}</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </aside>

          <div class="name">
            <h1 class="entry-type">
              {{ selectedEntry.type }}
              <span v-if="selectedEntry.tags && selectedEntry.tags.length"> // {{ selectedEntry.tags.join(', ') }}</span>
            </h1>
            <h2 class="entry-title">{{ selectedEntry.name }}</h2>
          </div>

          <!-- Body -->
          <div class="markdown" @click="handleMarkdownClick">
            <VueMarkdownIt :source="selectedEntry.content" class="markdown-body" />
          </div>

          <!-- Tag chips -->
          <div v-if="selectedEntry.tags && selectedEntry.tags.length" class="tag-chips">
            <span class="tag-chip" v-for="t in selectedEntry.tags" :key="t" @click="query = t">{{ t }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { VueMarkdownIt } from '@f3ve/vue-markdown-it'
import WorldEntry from '@/components/WorldEntry.vue'

const props = defineProps({ animate: { type: Boolean, required: true } })

const entries = ref([])
const selectedEntry = ref(null)
const query = ref('')
const typeFilter = ref('')

const baseKeys = new Set(['slug','name','type','tags','thumbnail','content'])

const filteredEntries = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value
    .filter(e => !typeFilter.value || (e.type || '').toLowerCase() === typeFilter.value.toLowerCase())
    .filter(e => {
      if (!q) return true
      const searchable = [e.name, e.type, ...(e.tags||[]), e.content]
      Object.entries(e).forEach(([k,v]) => {
        if (!baseKeys.has(k) && v) searchable.push(Array.isArray(v) ? v.join(' ') : String(v))
      })
      return searchable.join(' ').toLowerCase().includes(q)
    })
})

// infobox order (any other custom fields still searchable)
const INFOBOX_ORDER = ['aliases','gender','race','age','height','origin','ethnicity','occupation','title','languages','status','affiliations','location']
const infoboxRows = computed(() => {
  if (!selectedEntry.value) return []
  const s = selectedEntry.value
  const rows = []
  const used = new Set()
  for (const k of INFOBOX_ORDER) {
    const v = s[k]
    const has = v !== undefined && v !== null && (Array.isArray(v) ? v.length : String(v).trim())
    if (has) { rows.push({ label: labelize(k), value: v }); used.add(k) }
  }
  Object.entries(s).forEach(([k,v]) => {
    if (baseKeys.has(k) || used.has(k)) return
    if (v === undefined || v === null) return
    const text = Array.isArray(v) ? v.join('').trim() : String(v).trim()
    if (!text) return
    rows.push({ label: labelize(k), value: v })
  })
  return rows
})

function labelize(key) {
  return key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w|\s\w/g, c => c.toUpperCase())
}

// --- Tiny front-matter + Obsidian helpers (no deps) ---
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
    if (!line) { i++; continue }
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!m) { i++; continue }
    const key = m[1]; let val = m[2].trim()

    // block list
    if (val === '') {
      const arr = []; let j = i + 1
      while (j < lines.length) {
        const li = lines[j]; const t = li.trim()
        if (t.startsWith('- ')) { arr.push(t.slice(2).trim()); j++; continue }
        if (li.startsWith('  ') || li.startsWith('\t')) { j++; continue }
        break
      }
      if (arr.length) { data[key] = arr; i = j; continue }
    }
    // inline array
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim()
      data[key] = inner ? inner.split(',').map(s => s.trim()).filter(Boolean) : []
      i++; continue
    }
    // comma list (unless quoted)
    if (val.includes(',') && !(val.startsWith('"') || val.startsWith("'"))) {
      data[key] = val.split(',').map(s => s.trim()).filter(Boolean)
      i++; continue
    }
    // strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    data[key] = val; i++
  }
  return { data, content }
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function normalizeArray(val) {
  if (!val) return []
  return Array.isArray(val) ? val : String(val).split(',').map(s => s.trim()).filter(Boolean)
}
function transformWikiLinks(md) {
  // [[Target|Label]] or [[Target]]
  return md.replace(/\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const t = String(target).trim()
    const text = label ? String(label).trim() : t
    const slug = slugify(t)
    return `[${text}](wiki:${slug})`
  })
}
function transformWikiImages(md) {
  // ![[File.png|anything]] -> ![File](/world/File.png)
  return md.replace(/!\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g, (_, file) => {
    const name = String(file).trim()
    const alt = name.replace(/\.[^/.]+$/, '')
    return `![${alt}](/world/${name})`
  })
}
function extractInfobox(md, meta) {
  // Pull out > [!infobox] ... block (quoted lines) and parse table/key-values
  const lines = md.split('\n')
  const out = []; let i = 0; const collected = []
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('> [!infobox]')) {
      i++
      while (i < lines.length && lines[i].trim().startsWith('>')) { collected.push(lines[i]); i++ }
      continue
    }
    out.push(line); i++
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
      const parts = t.split('|').map(s => s.trim()).filter(Boolean)
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
    'gender': 'gender',
    'race': 'race',
    'age': 'age',
    'height': 'height',
    'origin': 'origin',
    'ethnicity': 'ethnicity',
    'occupation': 'occupation',
    'title': 'title',
    'languages': 'languages',
    'status': 'status',
    'affiliations': 'affiliations',
    'location': 'location',
  }
  Object.entries(map).forEach(([from, to]) => {
    if (kv[from] !== undefined) {
      merged[to] = /,/.test(kv[from]) ? kv[from].split(',').map(s => s.trim()).filter(Boolean) : kv[from]
    }
  })
  if (kv.__thumbnail && !merged.thumbnail) merged.thumbnail = kv.__thumbnail
  return { content: out.join('\n'), meta: merged }
}
// ---------------------------------------------------------------

function handleMarkdownClick(e) {
  const a = e.target.closest('a'); if (!a) return
  const href = a.getAttribute('href') || ''
  if (href.startsWith('wiki:')) {
    const slug = href.slice(5)
    const match = entries.value.find(en => en.slug === slug)
    if (match) selectEntry(match)
    else query.value = slug.replace(/-/g, ' ')
    e.preventDefault()
  }
}

function selectEntry(entry) { selectedEntry.value = entry }

async function importEntries() {
  // Look under src/ and (optionally) repo-root assets
  const modules = {
    ...import.meta.glob('@/assets/world/**/*.md', { query: '?raw', import: 'default' }),
    ...import.meta.glob('/src/assets/world/**/*.md', { query: '?raw', import: 'default' }),
    ...import.meta.glob('/assets/world/**/*.md', { query: '?raw', import: 'default' }),
  }
  const loaded = await Promise.all(Object.values(modules).map(fn => fn()))
  loaded.forEach(mod => {
    const raw = typeof mod === 'string' ? mod : mod.default

    // 1) front-matter if present
    let data = null, body = raw
    if (raw.startsWith('---')) { const fm = parseFrontMatter(raw); data = fm.data; body = fm.content }

    // 2) Obsidian transforms
    body = transformWikiImages(body)
    body = transformWikiLinks(body)
    const inf = extractInfobox(body, data || {})
    body = inf.content
    const meta = inf.meta || {}

    // 3) Build entry (fallback to 5-line header if no meta)
    let entry
    if (meta && (meta.name || meta.slug)) {
      entry = {
        slug: meta.slug || slugify(meta.name),
        name: meta.name || 'Untitled',
        type: meta.type || 'NPC',
        tags: normalizeArray(meta.tags),
        thumbnail: meta.thumbnail || '',
        content: body || '',
        ...Object.fromEntries(Object.entries(meta).filter(([k]) => !['slug','name','type','tags','thumbnail'].includes(k)))
      }
    } else {
      const lines = (raw || '').split('\n')
      entry = {
        slug: (lines[0] || '').trim(),
        name: (lines[1] || '').trim(),
        type: (lines[2] || 'NPC').trim(),
        tags: (lines[3] || '').split(',').map(s => s.trim()).filter(Boolean),
        thumbnail: (lines[4] || '').trim(),
        content: lines.slice(5).join('\n')
      }
    }
    entries.value.push(entry)
  })
  entries.value.sort((a, b) => a.name.localeCompare(b.name))
  selectedEntry.value = entries.value[0] || null
}

onMounted(importEntries)
</script>

<style scoped>
/* Wikipedia-style layout */
.wiki-article { position: relative; }
.entry-type { font-size: 1rem; letter-spacing: .04em; opacity: .85; margin-bottom: .25rem; }
.entry-title { font-size: 2rem; line-height: 1.2; margin: 0 0 .75rem; }

/* Right-side infobox */
.infobox { float: right; width: 300px; max-width: 40%; margin: 0 0 12px 16px; border: 1px solid var(--primary-color); background: var(--secondary-color); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.infobox-image { display:block; width:100%; height:auto; }
.infobox-table { width: 100%; border-collapse: collapse; font-size: .95rem; }
.infobox-label { text-align:left; vertical-align: top; padding: 6px 8px; font-weight: 600; width: 34%; border-bottom: 1px solid rgba(255,255,255,.08); }
.infobox-value { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.08); }

.tag-chips { margin-top: 8px; }
.tag-chip { display:inline-block; padding:2px 8px; border:1px solid var(--primary-color); border-radius:999px; font-size:.85rem; margin-right:6px; cursor:pointer; }

@media (max-width: 900px) {
  .infobox { float:none; max-width:100%; width:100%; margin:0 0 12px 0; }
}
</style>
