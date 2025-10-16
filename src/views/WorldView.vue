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
        <div class="event">
          <div class="name">
            <h1>{{ selectedEntry.type }} <span v-if="selectedEntry.tags && selectedEntry.tags.length">// {{ selectedEntry.tags.join(', ') }}</span></h1>
            <h2>{{ selectedEntry.name }}</h2>
          </div>
          <img class="thumbnail" :src="selectedEntry.thumbnail || '/icons/portrait.svg'" />
          <VueMarkdownIt :source="selectedEntry.content" class="markdown" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { VueMarkdownIt } from '@f3ve/vue-markdown-it'
import WorldEntry from '@/components/WorldEntry.vue'

const props = defineProps({
  animate: { type: Boolean, required: true }
})

const entries = ref([])
const selectedEntry = ref(null)
const query = ref('')
const typeFilter = ref('')

const filteredEntries = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value
    .filter(e => !typeFilter.value || (e.type || '').toLowerCase() === typeFilter.value.toLowerCase())
    .filter(e => !q || (e.name + ' ' + (e.type || '') + ' ' + (e.tags || []).join(' ') + ' ' + (e.content || '')).toLowerCase().includes(q))
})

function selectEntry(entry) {
  selectedEntry.value = entry
}

async function importEntries() {
  const modules = import.meta.glob('@/assets/world/*.md', { query: '?raw', import: 'default' })
  const loaded = await Promise.all(Object.values(modules).map(fn => fn()))
  loaded.forEach(mod => {
    const raw = typeof mod === 'string' ? mod : mod.default
    const lines = (raw || '').split('\n')
    const entry = {
      slug: (lines[0] || '').trim(),
      name: (lines[1] || '').trim(),
      type: (lines[2] || 'NPC').trim(),
      tags: (lines[3] || '').split(',').map(s => s.trim()).filter(Boolean),
      thumbnail: (lines[4] || '').trim(),
      content: lines.slice(5).join('\n')
    }
    entries.value.push(entry)
  })
  entries.value.sort((a, b) => a.name.localeCompare(b.name))
  selectedEntry.value = entries.value[0] || null
}

onMounted(importEntries)
</script>
