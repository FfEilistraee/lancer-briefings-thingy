<template>
  <div class="event" @click="() => $emit('select-entry', entry)" style="cursor:pointer">
    <div class="name">
      <h1>{{ entry.type }} <span v-if="entry.tags && entry.tags.length">// {{ entry.tags.join(', ') }}</span></h1>
      <h2>{{ entry.name }}</h2>
    </div>
    <img class="thumbnail" :src="entry.thumbnail || '/icons/portrait.svg'" />
    <div class="preview">{{ preview }}</div>
    <a @click.prevent="$emit('select-entry', entry)">Open</a>
  </div>
</template>

<script>
export default {
  props: {
    entry: { type: Object, required: true },
    animate: { type: Boolean, default: false },
  },
  computed: {
    preview() {
      const text = (this.entry.content || '')
        .replace(/[#>*_`~\[\]\(\)!|-]/g, ' ') // strip simple markdown
        .replace(/\s+/g, ' ') // collapse
        .trim();
      return text.length > 160 ? text.slice(0, 160) + '…' : text;
    },
  },
};
</script>