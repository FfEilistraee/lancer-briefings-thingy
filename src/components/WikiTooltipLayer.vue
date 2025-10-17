<template>
  <transition name="tooltip-fade">
    <div v-if="tooltip.visible && tooltip.entry" class="wiki-tooltip" :style="tooltipStyle">
      <div class="wiki-tooltip__header">
        <img
          v-if="tooltip.entry.thumbnail"
          class="wiki-tooltip__image"
          :src="tooltip.entry.thumbnail"
          :alt="tooltip.entry.name"
        />
        <div>
          <p class="wiki-tooltip__type">{{ tooltip.entry.type }}</p>
          <h3 class="wiki-tooltip__title">{{ tooltip.entry.name }}</h3>
        </div>
      </div>
      <p v-if="tooltip.entry.summary" class="wiki-tooltip__summary">{{ tooltip.entry.summary }}</p>
      <ul v-if="tooltip.entry.quickFacts.length" class="wiki-tooltip__facts">
        <li v-for="fact in tooltip.entry.quickFacts" :key="fact.label">
          <span class="wiki-tooltip__fact-label">{{ fact.label }}:</span>
          <span class="wiki-tooltip__fact-value">{{ fact.value }}</span>
        </li>
      </ul>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { useWikiTooltipState } from '@/utils/wikiTooltip'

const tooltip = useWikiTooltipState()

const tooltipStyle = computed(() => ({
  top: `${tooltip.y}px`,
  left: `${tooltip.x}px`,
}))
</script>

<style scoped>
.wiki-tooltip {
  position: fixed;
  max-width: 320px;
  padding: 14px 16px;
  background: rgba(12, 14, 22, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  z-index: 6;
  backdrop-filter: blur(6px);
}

.wiki-tooltip__header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.wiki-tooltip__image {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.wiki-tooltip__type {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.75;
  margin: 0 0 2px;
}

.wiki-tooltip__title {
  margin: 0;
  font-size: 1.05rem;
}

.wiki-tooltip__summary {
  margin: 0 0 8px;
  font-size: 0.85rem;
  line-height: 1.4;
  opacity: 0.88;
}

.wiki-tooltip__facts {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 4px;
}

.wiki-tooltip__fact-label {
  font-weight: 600;
  margin-right: 4px;
}

.wiki-tooltip__fact-value {
  opacity: 0.85;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.18s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
