import type { MetadataRoute } from 'next'

// TODO: update SITE_URL when domain is confirmed
const SITE_URL = 'https://builtforbookkeepers.ph'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
