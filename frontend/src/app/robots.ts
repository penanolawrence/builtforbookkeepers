import type { MetadataRoute } from 'next'

// TODO: update SITE_URL when domain is confirmed
const SITE_URL = 'https://builtforbookkeepers.ph'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/accountant/', '/client/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
