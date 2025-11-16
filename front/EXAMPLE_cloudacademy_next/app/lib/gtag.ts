// Google Analytics helper functions
// Documentation: https://developers.google.com/analytics/devguides/collection/gtagjs/pages

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || ''

// Check if GA is enabled
export const isGAEnabled = () => {
  return !!GA_TRACKING_ID && typeof window !== 'undefined'
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (!isGAEnabled()) return

  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  })
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
type GtagEvent = {
  action: string
  category: string
  label: string
  value?: number
}

export const event = ({ action, category, label, value }: GtagEvent) => {
  if (!isGAEnabled()) return

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  })
}

// Course-specific events
export const trackCourseClick = (courseName: string) => {
  event({
    action: 'click',
    category: 'Course',
    label: courseName,
  })
}

export const trackCourseStart = (courseName: string) => {
  event({
    action: 'start',
    category: 'Course',
    label: courseName,
  })
}

export const trackStepComplete = (courseName: string, stepNumber: number) => {
  event({
    action: 'step_complete',
    category: 'Course',
    label: `${courseName} - Step ${stepNumber}`,
    value: stepNumber,
  })
}

export const trackSignIn = (method: string) => {
  event({
    action: 'login',
    category: 'Auth',
    label: method,
  })
}

export const trackSignOut = () => {
  event({
    action: 'logout',
    category: 'Auth',
    label: 'user_logout',
  })
}

// Declare gtag type for TypeScript
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: any
    ) => void
  }
}
