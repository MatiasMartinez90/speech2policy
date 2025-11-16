import Head from 'next/head'

interface SEOProps {
  title: string
  description: string
  canonical?: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'profile'
  twitterCard?: 'summary' | 'summary_large_image'
  noindex?: boolean
  structuredData?: object
  keywords?: string
}

const defaultProps = {
  canonical: 'https://proyectos.cloudacademy.ar',
  ogImage: 'https://proyectos.cloudacademy.ar/og-image.jpg',
  ogType: 'website' as const,
  twitterCard: 'summary_large_image' as const,
  noindex: false,
}

export default function SEO({
  title,
  description,
  canonical = defaultProps.canonical,
  ogImage = defaultProps.ogImage,
  ogType = defaultProps.ogType,
  twitterCard = defaultProps.twitterCard,
  noindex = defaultProps.noindex,
  structuredData,
  keywords,
}: SEOProps) {
  const fullTitle = title.includes('CloudAcademy') ? title : `${title} | CloudAcademy`

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="CloudAcademy" />
      <meta property="og:locale" content="es_AR" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  )
}
