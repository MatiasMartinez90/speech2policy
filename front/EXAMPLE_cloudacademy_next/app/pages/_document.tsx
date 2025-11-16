import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  // Get GA_ID from environment variable
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID

  return (
    <Html lang="es">
      <Head>
        {/* Preconnect to external services for better performance */}
        <link rel="preconnect" href="https://cognito-idp.us-east-1.amazonaws.com" />
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="dns-prefetch" href="https://cognito-idp.us-east-1.amazonaws.com" />

        {/* Modern Favicon Configuration */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="author" content="CloudAcademy" />

        {/* Verificación de propietarios (placeholder - reemplazar con tokens reales) */}
        {/* <meta name="google-site-verification" content="your-verification-token" /> */}

        {/* Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Google Analytics 4 - Only load if GA_ID is configured */}
        {GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                    send_page_view: false
                  });
                `,
              }}
            />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
