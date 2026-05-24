const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export type TrainerListOut = {
  id: number
  external_id: string | null
  full_name: string
  region: string
  country: string | null
  role_title: string | null
  seniority_level: string | null
  languages: string
  bandwidth: string
  validation_status: string
  last_updated_at: string
}

export type TrainerDetailOut = TrainerListOut & {
  business_unit: string | null
  profile_summary: string | null
  manager_note: string | null
  skills: {
    id: number
    skill_name: string
    skill_category: string | null
    proficiency_level: number
    evidence_type: string | null
    evidence_note: string | null
  }[]
  projects: {
    id: number
    project_name: string
    client_sector: string | null
    role_on_project: string | null
    project_status: string
    time_commitment: string
    relevance_tags: string
  }[]
  comfort: {
    id: number
    meeting_type: string
    comfort_level: number
    confidence_note: string | null
    validated_by_manager: boolean
  }[]
  preference: {
    client_facing_desire: string
    travel_preference: string
    preferred_sectors: string
    stretch_interest: boolean
  } | null
}

export type ImportResultOut = {
  batch_id: number
  created_count: number
  updated_count: number
  error_count: number
  errors: {
    row_number: number
    field: string
    message: string
  }[]
}

export type MatchRequestIn = {
  request?: string | null
  topic: string
  meeting_type?: string | null
  industry?: string | null
  region?: string | null
  language?: string | null
  seniority?: string | null
  stretch_mode: boolean
  weights?: Record<string, number> | null
}

export type MatchResponseOut = {
  request_id: number
  results: {
    trainer_id: number
    full_name: string
    region: string
    role_title: string | null
    score: number
    reasons: string[]
    caveats: string[]
    components: Record<string, number>
  }[]
}

export type RequirementCompareOut = {
  filename: string
  extracted_text_preview: string
  inferred_request: MatchRequestIn
  match: MatchResponseOut
}

export type CoverageOut = {
  rows: {
    topic: string
    cells: {
      region: string
      best: number
      count: number
      trainer_names?: string[]
    }[]
  }[]
}

export type ScoringConfigOut = {
  id: number
  name: string
  skill: number
  comfort: number
  industry: number
  availability: number
  region: number
  desire: number
}

export type SkillCatalogCategoryOut = {
  category: string
  skills: string[]
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getHealth() {
  return requestJson<{ status: string }>('/health')
}

export function listTrainers() {
  return requestJson<TrainerListOut[]>('/trainers')
}

export function getTrainer(trainerId: number) {
  return requestJson<TrainerDetailOut>(`/trainers/${trainerId}`)
}

export function importTrainers(file: File) {
  const body = new FormData()
  body.append('file', file)
  return requestJson<ImportResultOut>('/imports/trainers', { method: 'POST', body })
}

export function matchTrainers(payload: MatchRequestIn) {
  return requestJson<MatchResponseOut>('/match', { method: 'POST', body: JSON.stringify(payload) })
}

export function compareRequirement(file: File) {
  const body = new FormData()
  body.append('file', file)
  return requestJson<RequirementCompareOut>('/requirements/compare', { method: 'POST', body })
}

export function getCoverage() {
  return requestJson<CoverageOut>('/analytics/coverage')
}

export function getScoringConfig() {
  return requestJson<ScoringConfigOut>('/config/scoring')
}

export function getSkillCatalog() {
  return requestJson<SkillCatalogCategoryOut[]>('/config/skill-catalog')
}

export function updateScoringConfig(payload: Omit<ScoringConfigOut, 'id' | 'name'>) {
  return requestJson<ScoringConfigOut>('/config/scoring', { method: 'PUT', body: JSON.stringify(payload) })
}
