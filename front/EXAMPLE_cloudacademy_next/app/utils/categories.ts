/**
 * Category Configuration
 *
 * Centralizes all category metadata (labels, emojis, colors, descriptions)
 *
 * Usage:
 * - Admin Panel: Render category select options
 * - Course Cards: Display category badge with emoji + color
 * - Category Pages: Hero sections with category branding
 *
 * Future Migration:
 * When categories become dynamic (admin-managed), this will be replaced
 * by API calls via useCategories hook. Components won't need to change.
 */

export const CATEGORY_CONFIG = {
  bedrock: {
    label: 'Bedrock',
    emoji: '🤖',
    color: 'from-purple-500 to-blue-600',
    description: 'Amazon Bedrock & RAG - Build AI chatbots with generative AI'
  },
  security: {
    label: 'Security',
    emoji: '🔒',
    color: 'from-red-500 to-orange-600',
    description: 'IAM, WAF, Shield - Secure your AWS infrastructure'
  },
  networking: {
    label: 'Networking',
    emoji: '🌐',
    color: 'from-blue-500 to-cyan-600',
    description: 'VPC, Route 53, CDN - Build scalable network architectures'
  },
  compute: {
    label: 'Compute',
    emoji: '⚡',
    color: 'from-yellow-500 to-orange-600',
    description: 'EC2, Lambda, ECS - Deploy and scale compute resources'
  },
  'aws-cloud-practitioner': {
    label: 'AWS Cloud Practitioner',
    emoji: '☁️',
    color: 'from-orange-500 to-yellow-600',
    description: 'AWS CLF-C02 Certification - Master cloud fundamentals'
  },
  devops: {
    label: 'DevOps',
    emoji: '⚙️',
    color: 'from-green-500 to-teal-600',
    description: 'CI/CD, Terraform, Docker - Automate your infrastructure'
  },
  databases: {
    label: 'Databases',
    emoji: '🗄️',
    color: 'from-indigo-500 to-purple-600',
    description: 'RDS, DynamoDB, Aurora - Design scalable data solutions'
  }
} as const

// TypeScript types for type safety
export type CategoryKey = keyof typeof CATEGORY_CONFIG

export interface CategoryConfig {
  label: string
  emoji: string
  color: string
  description: string
  // Dynamic fields from API (optional for backward compatibility)
  course_count?: number
  level?: 'beginner' | 'intermediate' | 'advanced'
  display_order?: number
  featured?: boolean
}

// Helper function to get category config with fallback
export function getCategoryConfig(categoryKey: string): CategoryConfig {
  const config = CATEGORY_CONFIG[categoryKey as CategoryKey]

  if (!config) {
    // Fallback for unknown categories
    return {
      label: categoryKey,
      emoji: '📚',
      color: 'from-gray-500 to-slate-600',
      description: 'Learn new skills with interactive courses'
    }
  }

  return config
}

// Helper to get all category keys as array
export function getAllCategoryKeys(): CategoryKey[] {
  return Object.keys(CATEGORY_CONFIG) as CategoryKey[]
}

// Helper to get categories as array of objects (useful for selects)
export function getCategoriesAsOptions() {
  return Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    value: key,
    label: `${config.emoji} ${config.label}`,
    emoji: config.emoji,
    color: config.color,
    description: config.description
  }))
}
