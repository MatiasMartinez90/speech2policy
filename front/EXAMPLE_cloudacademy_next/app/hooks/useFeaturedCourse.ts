import useSWR from 'swr'

interface Section {
  section_id: number
  title: string
  content: string
  estimated_time?: string
  order?: number
}

interface FeaturedCourse {
  course_id: string
  course_name: string
  description: string
  category: string
  difficulty: string
  is_published: boolean
  student_count: number
  average_rating: number
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string
}

interface FeaturedCourseResponse {
  course: FeaturedCourse | null
  sections: Section[]
  total_sections: number
  message?: string
}

const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function useFeaturedCourse() {
  const { data, error } = useSWR<FeaturedCourseResponse>(`${API_URL}/courses/featured`, fetcher)

  return {
    featuredCourse: data?.course,
    sections: data?.sections || [],
    loading: !error && !data,
    error: error,
  }
}
