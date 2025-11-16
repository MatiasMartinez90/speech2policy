// Web Vitals and performance tracking
// Documentation: https://github.com/GoogleChrome/web-vitals

import { Metric } from 'web-vitals'
import * as gtag from './gtag'

// Track Web Vitals to Google Analytics
export function sendToGoogleAnalytics({ name, delta, value, id }: Metric) {
  // Only send if GA is enabled
  if (!gtag.isGAEnabled()) {
    console.log('[Web Vitals]', name, { delta, value, id })
    return
  }

  // Send to GA4 as an event
  window.gtag('event', name, {
    event_category: 'Web Vitals',
    event_label: id,
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    non_interaction: true,
  })
}

// Report all Web Vitals metrics
export function reportWebVitals(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    })
  }

  // Send to analytics
  sendToGoogleAnalytics(metric)

  // You can also send to other analytics services here
  // Example: sendToVercelAnalytics(metric)
}

// Performance observer for custom metrics
export function observePerformance() {
  if (typeof window === 'undefined') return

  // Track time to interactive custom metric
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // You can track custom performance metrics here
          console.log('[Performance]', entry.name, entry.duration)
        }
      })

      observer.observe({ entryTypes: ['navigation', 'resource'] })
    } catch (e) {
      console.error('[Performance] Observer error:', e)
    }
  }
}
