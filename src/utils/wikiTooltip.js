import { reactive, readonly } from 'vue'
import { ensureWikiData } from '@/utils/wikiDataStore'
import { extractWikiSlug } from '@/utils/wiki'

const tooltipState = reactive({ visible: false, x: 0, y: 0, entry: null })

const POSITION_OFFSET = { x: 16, y: 24 }

function formatEntryForTooltip(entry) {
  if (!entry) return null
  return {
    name: entry.name,
    type: entry.type,
    thumbnail: entry.thumbnail,
    summary: entry.summary,
    quickFacts: Array.isArray(entry.quickFacts) ? entry.quickFacts : [],
  }
}

export function useWikiTooltipState() {
  return readonly(tooltipState)
}

export function hideWikiTooltip() {
  tooltipState.visible = false
  tooltipState.entry = null
}

export function updateWikiTooltipPosition(position) {
  if (!tooltipState.visible) return
  tooltipState.x = position.x
  tooltipState.y = position.y
}

export async function showWikiTooltipForSlug(slug, position) {
  if (!slug) {
    hideWikiTooltip()
    return
  }
  const { slugIndex } = await ensureWikiData()
  const entry = slugIndex[slug]
  if (!entry) {
    hideWikiTooltip()
    return
  }
  tooltipState.visible = true
  tooltipState.x = position.x
  tooltipState.y = position.y
  tooltipState.entry = formatEntryForTooltip(entry)
}

function computePosition(event) {
  return {
    x: event.clientX + POSITION_OFFSET.x,
    y: event.clientY + POSITION_OFFSET.y,
  }
}

export async function bindWikiTooltip(container, options = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container
  if (!el) return
  const { slugIndex } = await ensureWikiData()

  if (!el.dataset.wikiTooltipContainer) {
    if (options.hideOnScroll && typeof el.addEventListener === 'function') {
      el.addEventListener('scroll', hideWikiTooltip, { passive: true })
    }
    if (options.hideOnLeave !== false && typeof el.addEventListener === 'function') {
      el.addEventListener('mouseleave', hideWikiTooltip)
    }
    el.dataset.wikiTooltipContainer = 'true'
  }

  const links = Array.from(el.querySelectorAll('a[href^="wiki:"]'))
  links.forEach(link => {
    const href = link.getAttribute('href') || ''
    const slug = extractWikiSlug(href)
    if (!slug) return

    const resolved = !!slugIndex[slug]
    link.classList.toggle('wiki-link-resolved', resolved)
    link.classList.toggle('wiki-link-unresolved', !resolved)
    link.dataset.wikiResolved = resolved ? 'true' : 'false'

    if (!resolved) {
      link.dataset.wikiTooltipBound = 'false'
      return
    }

    if (link.dataset.wikiTooltipBound === 'true') return

    link.dataset.wikiTooltipBound = 'true'
    link.addEventListener('mouseenter', event => {
      showWikiTooltipForSlug(slug, computePosition(event))
    })
    link.addEventListener('mousemove', event => {
      updateWikiTooltipPosition(computePosition(event))
    })
    link.addEventListener('mouseleave', hideWikiTooltip)
  })
}

export const WIKI_TOOLTIP_OFFSET = POSITION_OFFSET
