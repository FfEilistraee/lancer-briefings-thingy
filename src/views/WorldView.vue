<template>
<section id="world-detail" class="section-container" v-if="selectedEntry">
<div style="height: 52px; overflow: hidden">
<div class="section-header clipped-medium-backward-events-logs">
<img src="/icons/conversation.svg" />
<h1>ENTRY</h1>
</div>
<div class="rhombus-back">&nbsp;</div>
</div>


<div class="section-content-container extra-margins">
<div class="event" v-if="selectedEntry">
<div class="name">
<h1>{{ selectedEntry.type }} <span v-if="selectedEntry.tags && selectedEntry.tags.length">// {{ selectedEntry.tags.join(', ') }}</span></h1>
<h2>{{ selectedEntry.name }}</h2>
</div>
<img class="thumbnail" :src="selectedEntry.thumbnail || '/icons/portrait.svg'" />
<vue-markdown-it :source="selectedEntry.content" class="markdown" />
</div>
</div>
</section>
</div>
</template>


<script>
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
import WorldEntry from '@/components/WorldEntry.vue';


export default {
components: { VueMarkdownIt, WorldEntry },
props: {
animate: { type: Boolean, required: true },
},
data() {
return {
entries: [],
selectedEntry: null,
query: '',
typeFilter: '',
};
},
created() {
this.importEntries(import.meta.glob('@/assets/world/*.md', { query: '?raw', import: 'default' }));
},
computed: {
filteredEntries() {
const q = this.query.trim().toLowerCase();
return this.entries
.filter(e => !this.typeFilter || (e.type || '').toLowerCase() === this.typeFilter.toLowerCase())
.filter(e => !q || (e.name + ' ' + (e.type||'') + ' ' + (e.tags||[]).join(' ') + ' ' + (e.content||'')).toLowerCase().includes(q));
},
},
methods: {
async importEntries(files) {
const filePromises = Object.keys(files).map(p => files[p]());
const contents = await Promise.all(filePromises);
contents.forEach(raw => {
const lines = raw.split('\n');
const entry = {
slug: (lines[0] || '').trim(),
name: (lines[1] || '').trim(),
type: (lines[2] || 'NPC').trim(),
tags: (lines[3] || '').split(',').map(s => s.trim()).filter(Boolean),
thumbnail: (lines[4] || '').trim(),
content: lines.slice(5).join('\n'),
};
this.entries = [...this.entries, entry];
});
this.entries.sort((a, b) => a.name.localeCompare(b.name));
this.selectedEntry = this.entries[0] || null;
},
selectEntry(entry) { this.selectedEntry = entry; },
},
};
</script>
