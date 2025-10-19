<template>
  <div class="timeline">
    <div v-for="event in events" :key="event.id" class="timeline-item">
      <div class="timeline-marker" />
      <div class="timeline-content">
        <p class="timeline-date">{{ event.date }}</p>
        <h4 v-if="event.title" class="timeline-title">{{ event.title }}</h4>
        <p v-if="event.description" class="timeline-description">{{ event.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  events: {
    type: Array,
    default: () => [],
  },
})
</script>

<style scoped>
.timeline {
  display: grid;
  gap: 12px;
  padding-left: 6px;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 12px;
  align-items: start;
}

.timeline-item::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: -12px;
  left: 7px;
  width: 2px;
  background: rgba(255, 255, 255, 0.2);
}

.timeline-item:last-child::before {
  bottom: 0;
}

.timeline-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--primary-color);
  background: var(--secondary-color);
  margin-top: 2px;
}

.timeline-content {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
}

.timeline-date {
  margin: 0 0 4px;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
}

.timeline-title {
  margin: 0 0 4px;
  font-size: 1rem;
}

.timeline-description {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  opacity: 0.86;
}
</style>
