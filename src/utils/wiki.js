export function slugify(input) {
  return String(input || '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function transformWikiLinks(markdown) {
  if (!markdown) return ''
  return String(markdown).replace(/\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const trimmedTarget = String(target).trim()
    const text = label ? String(label).trim() : trimmedTarget
    const slug = slugify(trimmedTarget)
    return `[${text}](wiki:${slug})`
  })
}

export function transformWikiImages(markdown) {
  if (!markdown) return ''
  return String(markdown).replace(/!\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g, (_, file) => {
    const name = String(file).trim()
    const alt = name.replace(/\.[^/.]+$/, '')
    return `![${alt}](/world/${name})`
  })
}

export function applyWikiTransforms(markdown) {
  const withImages = transformWikiImages(markdown)
  return transformWikiLinks(withImages)
}

export function isWikiHref(href) {
  return typeof href === 'string' && href.startsWith('wiki:')
}

export function extractWikiSlug(href) {
  if (!isWikiHref(href)) return null
  return href.slice(5)
}
