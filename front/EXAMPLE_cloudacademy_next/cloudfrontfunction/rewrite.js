// @ts-ignore
function handler(event) {
  var request = event.request
  var uri = request.uri

  // Root path - serve index.html
  if (uri === '/') {
    request.uri = '/index.html'
    return request
  }

  // If URI has a file extension (e.g., .js, .css, .png), serve as-is
  if (uri.includes('.')) {
    return request
  }

  // Handle Next.js dynamic routes
  // Pattern: /course/[any-id]/ -> /course/[id]/index.html
  if (uri.match(/^\/course\/[^\/]+\/?$/)) {
    request.uri = '/course/[id]/index.html'
    return request
  }

  // Pattern: /courses/[any-category]/ -> /courses/[category]/index.html
  if (uri.match(/^\/courses\/[^\/]+\/?$/)) {
    request.uri = '/courses/[category]/index.html'
    return request
  }

  // Pattern: /admin-panel/courses/[any-id]/preview -> /admin-panel/courses/[id]/preview/index.html
  if (uri.match(/^\/admin-panel\/courses\/[^\/]+\/preview\/?$/)) {
    request.uri = '/admin-panel/courses/[id]/preview/index.html'
    return request
  }

  // Pattern: /admin-panel/courses/[any-id]/sections -> /admin-panel/courses/[id]/sections/index.html
  if (uri.match(/^\/admin-panel\/courses\/[^\/]+\/sections\/?$/)) {
    request.uri = '/admin-panel/courses/[id]/sections/index.html'
    return request
  }

  // For paths without trailing slash, add it and append index.html
  // This handles Next.js static export structure: /about -> /about/index.html
  if (!uri.endsWith('/')) {
    request.uri += '/index.html'
  } else {
    // Already has trailing slash, just add index.html
    request.uri += 'index.html'
  }

  return request
}
