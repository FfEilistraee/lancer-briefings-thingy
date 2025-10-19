<template>
	<div class="sidebar-page">
		<section class="sidebar-layout">
        <o-sidebar
          id="sidebar"
          position="static"
          :animate="animate"
          :mobile="mobile"
          :expand-on-hover="expandOnHover"
          :reduce="reduce"
          open>
          <div class="sidebar-links">
            <router-link class="clipped-bottom-right" to="/status">
              <img src="/icons/orbital.svg" />
              <span>Status</span>
            </router-link>
            <router-link class="clipped-bottom-right" to="/pilots">
              <img src="/icons/pilot.svg" />
              <span>Pilots</span>
            </router-link>
            <router-link class="clipped-bottom-right" to="/events">
              <img src="/icons/events.svg" />
              <span>Logs</span>
            </router-link>
            <router-link class="clipped-bottom-right" to="/world">
              <img src="/icons/npc.svg" />
              <span>World</span>
            </router-link>
          </div>
          <div class="sidebar-admin">
            <router-link class="clipped-bottom-right admin-link" to="/admin">
              <img src="/icons/protocol.svg" />
              <span>Admin</span>
            </router-link>
            <p class="admin-link__hint">GM access</p>
          </div>
        </o-sidebar>
                </section>
        </div>
</template>

<script>
export default {
	props: {
		animate: {
			type: Boolean,
			required: true,
		},
	},
	data() {
		return {
			expandOnHover: false,
			mobile: "reduced",
			reduce: false,
		};
	},
};
</script>

<style scoped>
:deep(.o-sidebar-content) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100vh;
  position: relative;
  padding-bottom: 72px;
}

.sidebar-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-admin {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 6px;
}

.admin-link {
  opacity: 0.7;
  font-size: 0.85rem;
}

.admin-link:hover {
  opacity: 1;
}

.admin-link__hint {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.45;
  padding-left: 12px;
}
</style>
