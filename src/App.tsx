import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import {
  compareRequirement,
  getCoverage,
  getHealth,
  getScoringConfig,
  getSkillCatalog,
  getTrainer,
  importTrainers,
  listTrainers,
  matchTrainers,
  updateScoringConfig,
  type CoverageOut,
  type MatchResponseOut,
  type SkillCatalogCategoryOut,
  type TrainerDetailOut,
} from './api'

type Region = 'EMEA' | 'NA' | 'UK' | 'HK' | 'MY' | 'SG' | 'AUS'
type MeetingType = 'Intro call' | 'Executive pitch' | 'Workshop' | 'Deep dive'
type Desire = 'Actively seeking' | 'Open selectively' | 'Neutral' | 'Limited interest'
type ValidationStatus = 'Self-declared' | 'Manager-validated' | 'Community-validated'
type Bandwidth = 'Low' | 'Medium' | 'High'

type Skill = {
  name: string
  category: string
  level: number
  evidence: string
}

type Project = {
  name: string
  sector: string
  status: 'Active' | 'Closing' | 'Recent' | 'Pipeline'
  commitment: Bandwidth
  tags: string[]
}

type Trainer = {
  id: string
  name: string
  region: Region
  country: string
  role: string
  seniority: string
  languages: string[]
  summary: string
  skills: Skill[]
  industries: string[]
  projects: Project[]
  bandwidth: Bandwidth
  comfort: Record<MeetingType, number>
  comfortNotes: Record<MeetingType, string>
  desire: Desire
  travel: 'Local only' | 'Regional' | 'Global'
  stretch: boolean
  validation: ValidationStatus
  managerNote: string
  updatedDaysAgo: number
}

type RequestState = {
  text: string
  topic: string
  otherTopic: string
  region: 'Any' | 'Other' | Region
  otherRegion: string
  meetingType: 'Any' | 'Other' | MeetingType
  otherMeetingType: string
  industry: string
  otherIndustry: string
  language: string
  otherLanguage: string
  seniority: string
  stretchMode: boolean
}

type Weights = {
  skill: number
  comfort: number
  industry: number
  availability: number
  region: number
  desire: number
}

type MatchResult = {
  trainer: Trainer
  score: number
  reasons: string[]
  caveats: string[]
  parts: Record<keyof Weights, number>
}

type CoverageRow = {
  topic: string
  cells: {
    region: string
    best: number
    count: number
    trainerNames?: string[]
  }[]
}

type SkillCatalogGroup = SkillCatalogCategoryOut

const meetingTypes: MeetingType[] = ['Intro call', 'Executive pitch', 'Workshop', 'Deep dive']
const regions: Region[] = ['EMEA', 'NA', 'UK', 'HK', 'MY', 'SG', 'AUS']
const industries = ['Banking', 'Retail', 'Public sector', 'Manufacturing', 'Technology', 'Healthcare']
const defaultSkillCatalog: SkillCatalogGroup[] = [
  {
    category: 'Software Engineering',
    skills: [
      '.Net',
      'C#',
      'Java',
      'JPA/Hibernate',
      'Mockito',
      'OOD',
      'Spring Framework',
      'Spring Security',
      'UML',
      'Mainframe Dev',
      'Microservices',
      'Full Stack Web Development - Java',
    ],
  },
  {
    category: 'AI/ML',
    skills: [
      'Spec Driven Development (SDD)',
      'Prompt Engineering Framework',
      'RAG',
      'LLM Models',
      'LangChain, Spring AI, LangChain4j, Semantic Kernel',
      'SonarSource',
      'Validation/Guardrails - Pydantic',
      'LangGraph/Workflow Framework',
      'Retrieval Layer - ChromaDB/Any Vector DB',
      'AI Governance',
      'Automation',
    ],
  },
  {
    category: 'Business Management',
    skills: [
      'Business Analysis',
      'Change Management',
      'Financial Industry Awareness',
      'Governance',
      'Leadership Coaching & Change',
      'MS Dynamics',
      'Product Management',
      'Professional Skills',
      'Risk Management',
      'Stakeholder Engagement',
    ],
  },
  {
    category: 'Cloud',
    skills: ['Cloud Computing', 'Cloud Migration', 'GCP/AWS/Microsoft Azure', 'VMWare', 'Cloud Modernisation'],
  },
  {
    category: 'IT Operations',
    skills: ['OS Admin', 'Unix', 'Linux', 'ITIL'],
  },
  {
    category: 'DevOps',
    skills: ['CI/CD', 'Jenkins', 'Docker/Kubernetes', 'Git/Github/Gitlab', 'SonarSource', 'Gradle', 'Linux', 'Power Automate', 'Terraform'],
  },
  {
    category: 'Project Management',
    skills: ['Agile Scrum', 'Confluence', 'Jira', 'Release Management', 'Scrum Master'],
  },
  {
    category: 'Data Analytics/Engineering',
    skills: [
      'Python',
      'Data Visualization With Tableau',
      'Data Visualization With Power BI',
      'Databricks',
      'Hadoop Environment (HDFS, Hive, MapReduce)',
      'Apache Spark, PySpark',
      'Kafka',
      'Data Analytics',
      'Data Engineering',
      'Data Science',
    ],
  },
  {
    category: 'Database Management',
    skills: ['SQL', 'PL-SQL', 'MongoDB', 'JSON'],
  },
  {
    category: 'Web Application',
    skills: ['Angular', 'Bootstrap', 'HTML/CSS', 'JQuery', 'Next.js', 'PowerApps', 'React', 'ReactJS', 'REST API'],
  },
  {
    category: 'Testing',
    skills: ['API Testing', 'Appium/Mobile Testing', 'Database/JDBC Testing', 'Playwright', 'Postman', 'Selenium/Cucumber', 'Specflow', 'TDD/JMeter', 'TestNG', 'Cybersecurity'],
  },
  {
    category: 'Other Programming Languages',
    skills: ['C/C++', 'COBOL', 'Javascript', 'NodeJS', 'Ruby on Rails', 'Scala', 'Typescript'],
  },
  {
    category: 'Soft Skills',
    skills: ['Communication', 'Interpersonal Skills', 'Problem Solving', 'Strategic Thinking', 'Time Management', 'Consultancy'],
  },
]
const topics = defaultSkillCatalog.flatMap((group) => group.skills)
const skillCategoryOrder = [
  ...defaultSkillCatalog.map((group) => group.category),
  'Additional Skills',
  'Custom',
]
const defaultTopicCategories: Record<string, string> = Object.fromEntries(
  defaultSkillCatalog.flatMap((group) => group.skills.map((skill) => [skill, group.category])),
)
const defaultWeights: Weights = {
  skill: 35,
  comfort: 20,
  industry: 15,
  availability: 10,
  region: 10,
  desire: 10,
}

const initialRequest: RequestState = {
  text: 'Need someone for a retail AI introduction meeting in Germany next week',
  topic: 'AI Governance',
  otherTopic: '',
  region: 'EMEA',
  otherRegion: '',
  meetingType: 'Intro call',
  otherMeetingType: '',
  industry: 'Retail',
  otherIndustry: '',
  language: 'English',
  otherLanguage: '',
  seniority: 'Any',
  stretchMode: false,
}

const demoTrainers: Trainer[] = [
  {
    id: 't-001',
    name: 'Anika Meier',
    region: 'EMEA',
    country: 'Germany',
    role: 'Principal Trainer',
    seniority: 'Principal',
    languages: ['English', 'German'],
    summary: 'AI governance and responsible adoption lead with recent retail executive advisory work.',
    skills: [
      { name: 'AI Governance', category: 'AI/ML', level: 5, evidence: 'Led retail AI risk workshops' },
      { name: 'Change Management', category: 'Business Management', level: 4, evidence: 'Delivered enablement playbooks' },
      { name: 'Data Analytics', category: 'Data Analytics/Engineering', level: 3, evidence: 'Built analytics training modules' },
    ],
    industries: ['Retail', 'Manufacturing', 'Technology'],
    projects: [
      {
        name: 'Retail AI readiness program',
        sector: 'Retail',
        status: 'Closing',
        commitment: 'Medium',
        tags: ['AI Governance', 'Executive pitch'],
      },
    ],
    bandwidth: 'Medium',
    comfort: { 'Intro call': 5, 'Executive pitch': 4, Workshop: 5, 'Deep dive': 3 },
    comfortNotes: {
      'Intro call': 'Can lead discovery and shape agenda independently.',
      'Executive pitch': 'Strong with a sales lead in the room.',
      Workshop: 'Confident facilitator for mixed business and technical groups.',
      'Deep dive': 'Best paired with a technical specialist.',
    },
    desire: 'Open selectively',
    travel: 'Regional',
    stretch: false,
    validation: 'Manager-validated',
    managerNote: 'Validated for client discovery, workshops, and regional advisory conversations.',
    updatedDaysAgo: 18,
  },
  {
    id: 't-002',
    name: 'Ravi Nair',
    region: 'SG',
    country: 'Singapore',
    role: 'Senior Cloud Trainer',
    seniority: 'Senior',
    languages: ['English', 'Tamil'],
    summary: 'Cloud modernisation trainer who wants more client exposure and has strong workshop delivery evidence.',
    skills: [
      { name: 'Cloud Modernisation', category: 'Cloud', level: 5, evidence: 'Migrated enterprise lab curriculum' },
      { name: 'Automation', category: 'AI/ML', level: 4, evidence: 'Built platform automation modules' },
      { name: 'Cybersecurity', category: 'Testing', level: 3, evidence: 'Cloud security foundations certified' },
    ],
    industries: ['Technology', 'Banking', 'Public sector'],
    projects: [
      {
        name: 'SG cloud academy',
        sector: 'Technology',
        status: 'Active',
        commitment: 'Medium',
        tags: ['Cloud Modernisation', 'Workshop'],
      },
    ],
    bandwidth: 'Medium',
    comfort: { 'Intro call': 3, 'Executive pitch': 2, Workshop: 5, 'Deep dive': 4 },
    comfortNotes: {
      'Intro call': 'Comfortable supporting discovery with prep.',
      'Executive pitch': 'Interested but should not lead alone yet.',
      Workshop: 'Can lead technical and practitioner sessions.',
      'Deep dive': 'Strong in cloud architecture discussions.',
    },
    desire: 'Actively seeking',
    travel: 'Regional',
    stretch: true,
    validation: 'Manager-validated',
    managerNote: 'Good stretch candidate for discovery calls when paired with a senior lead.',
    updatedDaysAgo: 9,
  },
  {
    id: 't-003',
    name: 'Maya Carter',
    region: 'NA',
    country: 'United States',
    role: 'Cybersecurity Enablement Lead',
    seniority: 'Lead',
    languages: ['English', 'Spanish'],
    summary: 'Cybersecurity specialist with banking and healthcare experience, strongest in executive briefings.',
    skills: [
      { name: 'Cybersecurity', category: 'Testing', level: 5, evidence: 'CISO simulation program owner' },
      { name: 'AI Governance', category: 'AI/ML', level: 3, evidence: 'AI risk controls module' },
      { name: 'Data Analytics', category: 'Data Analytics/Engineering', level: 3, evidence: 'Threat analytics course' },
    ],
    industries: ['Banking', 'Healthcare', 'Technology'],
    projects: [
      {
        name: 'Banking cyber boardroom simulation',
        sector: 'Banking',
        status: 'Recent',
        commitment: 'Low',
        tags: ['Cybersecurity', 'Executive pitch'],
      },
    ],
    bandwidth: 'Low',
    comfort: { 'Intro call': 4, 'Executive pitch': 5, Workshop: 4, 'Deep dive': 4 },
    comfortNotes: {
      'Intro call': 'Good at qualifying risk themes.',
      'Executive pitch': 'Can lead senior stakeholder briefings.',
      Workshop: 'Strong facilitator for security leaders.',
      'Deep dive': 'Comfortable with controls and operating model depth.',
    },
    desire: 'Open selectively',
    travel: 'Global',
    stretch: false,
    validation: 'Community-validated',
    managerNote: 'Trusted for regulated-sector client conversations.',
    updatedDaysAgo: 41,
  },
  {
    id: 't-004',
    name: 'Sophie van Dijk',
    region: 'EMEA',
    country: 'Netherlands',
    role: 'Data and AI Trainer',
    seniority: 'Senior',
    languages: ['English', 'Dutch', 'German'],
    summary: 'Data analytics and AI trainer with high appetite for more client-facing work.',
    skills: [
      { name: 'Data Analytics', category: 'Data Analytics/Engineering', level: 5, evidence: 'Analytics academy lead' },
      { name: 'AI Governance', category: 'AI/ML', level: 4, evidence: 'Responsible AI client labs' },
      { name: 'Automation', category: 'AI/ML', level: 3, evidence: 'Workflow automation labs' },
    ],
    industries: ['Retail', 'Public sector', 'Banking'],
    projects: [
      {
        name: 'Public sector data literacy',
        sector: 'Public sector',
        status: 'Active',
        commitment: 'High',
        tags: ['Data Analytics', 'AI Governance'],
      },
    ],
    bandwidth: 'High',
    comfort: { 'Intro call': 4, 'Executive pitch': 3, Workshop: 5, 'Deep dive': 4 },
    comfortNotes: {
      'Intro call': 'Comfortable with a clear brief.',
      'Executive pitch': 'Prefers to support a principal trainer.',
      Workshop: 'Excellent hands-on workshop lead.',
      'Deep dive': 'Strong in data quality and governance topics.',
    },
    desire: 'Actively seeking',
    travel: 'Regional',
    stretch: true,
    validation: 'Self-declared',
    managerNote: 'Needs manager validation for independent executive work.',
    updatedDaysAgo: 77,
  },
  {
    id: 't-005',
    name: 'Omar Haddad',
    region: 'EMEA',
    country: 'United Arab Emirates',
    role: 'Transformation Trainer',
    seniority: 'Lead',
    languages: ['English', 'Arabic', 'French'],
    summary: 'Change and transformation trainer with broad regional coverage and strong client facilitation.',
    skills: [
      { name: 'Change Management', category: 'Business Management', level: 5, evidence: 'Regional transformation toolkit owner' },
      { name: 'Cloud Modernisation', category: 'Cloud', level: 3, evidence: 'Cloud adoption workshops' },
      { name: 'Automation', category: 'AI/ML', level: 4, evidence: 'Process automation bootcamps' },
    ],
    industries: ['Public sector', 'Manufacturing', 'Technology'],
    projects: [
      {
        name: 'Regional operating model rollout',
        sector: 'Public sector',
        status: 'Closing',
        commitment: 'Low',
        tags: ['Change Management', 'Workshop'],
      },
    ],
    bandwidth: 'Low',
    comfort: { 'Intro call': 4, 'Executive pitch': 4, Workshop: 5, 'Deep dive': 2 },
    comfortNotes: {
      'Intro call': 'Good at discovery and stakeholder mapping.',
      'Executive pitch': 'Can lead business-led pitches.',
      Workshop: 'Very strong facilitator.',
      'Deep dive': 'Needs subject expert support for technical depth.',
    },
    desire: 'Neutral',
    travel: 'Global',
    stretch: false,
    validation: 'Manager-validated',
    managerNote: 'Reliable client facilitator for change and adoption themes.',
    updatedDaysAgo: 22,
  },
  {
    id: 't-006',
    name: 'Elena Rossi',
    region: 'EMEA',
    country: 'Italy',
    role: 'AI Solutions Trainer',
    seniority: 'Principal',
    languages: ['English', 'Italian', 'Spanish'],
    summary: 'Deep AI and automation specialist, excellent technical depth but limited appetite for early-stage sales calls.',
    skills: [
      { name: 'AI Governance', category: 'AI/ML', level: 4, evidence: 'AI controls reference architecture' },
      { name: 'Automation', category: 'AI/ML', level: 5, evidence: 'Enterprise automation academy' },
      { name: 'Cloud Modernisation', category: 'Cloud', level: 4, evidence: 'AI platform migration labs' },
    ],
    industries: ['Technology', 'Manufacturing', 'Retail'],
    projects: [
      {
        name: 'Automation platform uplift',
        sector: 'Manufacturing',
        status: 'Active',
        commitment: 'High',
        tags: ['Automation', 'Deep dive'],
      },
    ],
    bandwidth: 'High',
    comfort: { 'Intro call': 2, 'Executive pitch': 3, Workshop: 4, 'Deep dive': 5 },
    comfortNotes: {
      'Intro call': 'Prefers not to lead broad discovery calls currently.',
      'Executive pitch': 'Can support technical portions.',
      Workshop: 'Strong with technical practitioners.',
      'Deep dive': 'Excellent technical depth.',
    },
    desire: 'Limited interest',
    travel: 'Regional',
    stretch: false,
    validation: 'Community-validated',
    managerNote: 'Use when the client need is technical depth rather than broad discovery.',
    updatedDaysAgo: 14,
  },
]

function scoreAvailability(bandwidth: Bandwidth) {
  return bandwidth === 'Low' ? 100 : bandwidth === 'Medium' ? 62 : 24
}

function scoreDesire(desire: Desire, stretch: boolean) {
  const base = desire === 'Actively seeking' ? 100 : desire === 'Open selectively' ? 76 : desire === 'Neutral' ? 48 : 18
  return stretch ? Math.min(100, base + 16) : base
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function displayCaseSkill(text: string): string {
  const special: Record<string, string> = {
    ai: 'AI',
    api: 'API',
    aws: 'AWS',
    ci: 'CI',
    cobol: 'COBOL',
    css: 'CSS',
    db: 'DB',
    gcp: 'GCP',
    hdfs: 'HDFS',
    html: 'HTML',
    itil: 'ITIL',
    jdbc: 'JDBC',
    jquery: 'JQuery',
    json: 'JSON',
    llm: 'LLM',
    mongodb: 'MongoDB',
    ms: 'MS',
    nextjs: 'NextJS',
    ood: 'OOD',
    pl: 'PL',
    powerapps: 'PowerApps',
    pyspark: 'PySpark',
    rag: 'RAG',
    reactjs: 'ReactJS',
    rest: 'REST',
    sdd: 'SDD',
    sql: 'SQL',
    tdd: 'TDD',
    uml: 'UML',
    vmware: 'VMWare',
  }

  return text
    .trim()
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      if (word.includes('/')) return word.split('/').map(displayCaseSkill).join('/')
      if (word.includes('-')) return word.split('-').map(displayCaseSkill).join('-')
      const lower = word.toLowerCase()
      return special[lower] || `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`
    })
    .join(' ')
}

function parseRequestText(text: string, current: RequestState): RequestState {
  const next = { ...current, text }
  const haystack = normalize(text)
  const matchedTopic = topics.find((topic) => haystack.includes(normalize(topic))) || topics.find((topic) => {
    const [first] = normalize(topic).split(' ')
    return haystack.includes(first)
  })
  const matchedIndustry = industries.find((industry) => haystack.includes(normalize(industry)))
  const matchedRegion = regions.find((region) => haystack.includes(normalize(region)))

  if (matchedTopic) next.topic = matchedTopic
  if (matchedIndustry) next.industry = matchedIndustry
  if (matchedRegion) next.region = matchedRegion
  if (haystack.includes('germany') || haystack.includes('italy') || haystack.includes('france')) next.region = 'EMEA'
  if (haystack.includes('united states') || haystack.includes('canada') || haystack.includes('north america')) next.region = 'NA'
  if (haystack.includes('united kingdom') || haystack.includes('london')) next.region = 'UK'
  if (haystack.includes('hong kong')) next.region = 'HK'
  if (haystack.includes('malaysia') || haystack.includes('kuala lumpur')) next.region = 'MY'
  if (haystack.includes('singapore')) next.region = 'SG'
  if (haystack.includes('australia') || haystack.includes('sydney') || haystack.includes('melbourne')) next.region = 'AUS'
  if (haystack.includes('intro') || haystack.includes('discovery')) next.meetingType = 'Intro call'
  if (haystack.includes('pitch') || haystack.includes('executive')) next.meetingType = 'Executive pitch'
  if (haystack.includes('workshop')) next.meetingType = 'Workshop'
  if (haystack.includes('deep dive') || haystack.includes('technical')) next.meetingType = 'Deep dive'
  if (haystack.includes('stretch') || haystack.includes('development') || haystack.includes('more client')) {
    next.stretchMode = true
  }

  return next
}

function resolveRequest(request: RequestState): RequestState {
  return {
    ...request,
    topic: request.topic === 'Other' ? request.otherTopic.trim() : request.topic,
    region: request.region === 'Other' ? (request.otherRegion.trim() as RequestState['region']) : request.region,
    meetingType:
      request.meetingType === 'Other'
        ? (request.otherMeetingType.trim() as RequestState['meetingType'])
        : request.meetingType,
    industry: request.industry === 'Other' ? request.otherIndustry.trim() : request.industry,
    language: request.language === 'Other' ? request.otherLanguage.trim() : request.language,
  }
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function calculateMatches(request: RequestState, weights: Weights, source: Trainer[]): MatchResult[] {
  return source
    .filter((trainer) => {
      if (request.language && !trainer.languages.some((language) => normalize(language) === normalize(request.language))) {
        return false
      }
      if (request.seniority !== 'Any' && trainer.seniority !== request.seniority) return false
      return true
    })
    .map((trainer) => {
      const matchedSkill = trainer.skills.find((skill) => normalize(skill.name).includes(normalize(request.topic)))
      const fuzzySkill = trainer.skills.find((skill) => {
        const [first] = normalize(request.topic).split(' ')
        return normalize(skill.name).includes(first)
      })
      const skill = matchedSkill || fuzzySkill
      const skillScore = skill ? skill.level * 20 : 10
      const knownMeetingType = meetingTypes.includes(request.meetingType as MeetingType)
      const comfortScore = request.meetingType === 'Any' ? 70 : knownMeetingType ? trainer.comfort[request.meetingType as MeetingType] * 20 : 50
      const hasIndustryFilter = Boolean(request.industry && request.industry !== 'Any')
      const industryScore = hasIndustryFilter
        ? trainer.industries.some((industry) => normalize(industry) === normalize(request.industry))
          ? 100
          : trainer.projects.some((project) => normalize(project.sector) === normalize(request.industry))
            ? 82
            : 24
        : 60
      const regionScore = request.region === 'Any' ? 70 : trainer.region === request.region ? 100 : trainer.travel === 'Global' ? 68 : 34
      const availabilityScore = scoreAvailability(trainer.bandwidth)
      const desireScore = scoreDesire(trainer.desire, request.stretchMode || trainer.stretch)
      const validationBonus = trainer.validation === 'Self-declared' ? -4 : trainer.validation === 'Manager-validated' ? 4 : 6
      const stalePenalty = trainer.updatedDaysAgo > 60 ? 5 : 0

      const parts = {
        skill: skillScore,
        comfort: comfortScore,
        industry: industryScore,
        availability: availabilityScore,
        region: regionScore,
        desire: desireScore,
      }

      const weightedTotal = Object.entries(parts).reduce((total, [key, value]) => {
        return total + value * (weights[key as keyof Weights] / 100)
      }, 0)

      const totalWeight = Object.values(weights).reduce((total, value) => total + value, 0)
      const score = Math.max(0, Math.min(100, Math.round((weightedTotal / totalWeight) * 100 + validationBonus - stalePenalty)))

      const reasons = [
        skill ? `${skill.name} depth rated ${skill.level}/5` : 'Partial topic match only',
        request.meetingType === 'Any'
          ? 'Broad meeting-type profile available'
          : knownMeetingType
            ? `${request.meetingType} comfort rated ${trainer.comfort[request.meetingType as MeetingType]}/5`
            : `${request.meetingType} treated as custom meeting type`,
        hasIndustryFilter && industryScore > 80 ? `${request.industry} evidence present` : `${trainer.region} coverage with ${trainer.travel.toLowerCase()} travel`,
      ]

      const caveats = [
        trainer.bandwidth === 'High' ? 'High current project load' : '',
        trainer.validation === 'Self-declared' ? 'Readiness needs validation' : '',
        trainer.updatedDaysAgo > 60 ? 'Profile is stale' : '',
        knownMeetingType && trainer.comfort[request.meetingType as MeetingType] <= 2 ? 'Should not lead this meeting type alone' : '',
      ].filter(Boolean)

      return { trainer, score, reasons, caveats, parts }
    })
    .sort((a, b) => b.score - a.score)
}

function exportCsv(rows: Trainer[]) {
  const header = [
    'name',
    'region',
    'country',
    'role',
    'seniority',
    'languages',
    'skills',
    'industries',
    'bandwidth',
    'desire',
    'validation',
    'updated_days_ago',
  ]
  const body = rows.map((trainer) => [
    trainer.name,
    trainer.region,
    trainer.country,
    trainer.role,
    trainer.seniority,
    trainer.languages.join('; '),
    trainer.skills.map((skill) => `${skill.name}:${skill.level}`).join('; '),
    trainer.industries.join('; '),
    trainer.bandwidth,
    trainer.desire,
    trainer.validation,
    trainer.updatedDaysAgo.toString(),
  ])
  const csv = [header, ...body]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'trainer-match-profiles.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

function readSimpleCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

function trainersFromRows(rows: string[][]): Trainer[] {
  const [header = [], ...records] = rows
  const keys = header.map((key) => normalize(key).replaceAll(' ', '_'))

  return records.map((record, index) => {
    const value = (name: string) => record[keys.indexOf(name)] || ''
    const skillCells = value('skills')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
    const parsedSkills = skillCells.length
      ? skillCells.map((item) => {
          const [name, rating] = item.split(':')
          const skillName = displayCaseSkill(name)
          return {
            name: skillName,
            category: defaultTopicCategories[skillName] || 'Additional Skills',
            level: Math.max(1, Math.min(5, Number(rating) || 3)),
            evidence: 'Imported from trainer spreadsheet',
          }
        })
      : [{ name: displayCaseSkill(value('topic') || 'General training'), category: 'Additional Skills', level: 3, evidence: 'Imported row' }]

    return {
      id: `csv-${index}`,
      name: value('name') || value('full_name') || `Imported trainer ${index + 1}`,
      region: asRegion(value('region')),
      country: value('country') || 'Unspecified',
      role: value('role') || value('role_title') || 'Trainer',
      seniority: value('seniority') || value('seniority_level') || 'Senior',
      languages: (value('languages') || 'English').split(';').map((item) => item.trim()).filter(Boolean),
      summary: value('summary') || 'Imported profile from spreadsheet data.',
      skills: parsedSkills,
      industries: (value('industries') || value('industry') || 'Technology').split(';').map((item) => item.trim()).filter(Boolean),
      projects: [
        {
          name: value('project') || 'Imported current project',
          sector: value('industry') || value('industries') || 'Technology',
          status: 'Recent',
          commitment: ((value('bandwidth') as Bandwidth) || 'Medium') as Bandwidth,
          tags: parsedSkills.map((skill) => skill.name),
        },
      ],
      bandwidth: ((value('bandwidth') as Bandwidth) || 'Medium') as Bandwidth,
      comfort: { 'Intro call': 3, 'Executive pitch': 3, Workshop: 3, 'Deep dive': 3 },
      comfortNotes: {
        'Intro call': 'Imported profile needs comfort detail.',
        'Executive pitch': 'Imported profile needs comfort detail.',
        Workshop: 'Imported profile needs comfort detail.',
        'Deep dive': 'Imported profile needs comfort detail.',
      },
      desire: ((value('desire') as Desire) || 'Neutral') as Desire,
      travel: 'Regional',
      stretch: normalize(value('stretch')) === 'true' || normalize(value('stretch')) === 'yes',
      validation: ((value('validation') as ValidationStatus) || 'Self-declared') as ValidationStatus,
      managerNote: value('manager_note') || 'Imported profile needs manager validation.',
      updatedDaysAgo: Number(value('updated_days_ago')) || 0,
    }
  })
}

function trainersFromCsv(text: string): Trainer[] {
  return trainersFromRows(readSimpleCsv(text))
}

async function trainersFromSpreadsheet(file: File): Promise<Trainer[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []

  const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    blankrows: false,
    defval: '',
  })

  return trainersFromRows(rows.map((row) => row.map((cell) => String(cell ?? '').trim())))
}

const emptyTrainer: Trainer = {
  id: 'empty',
  name: 'No trainer selected',
  region: 'SG',
  country: 'Import data to begin',
  role: 'Trainer',
  seniority: 'Unspecified',
  languages: ['English'],
  summary: 'Upload a trainer spreadsheet or start the backend with persisted data to see profile detail.',
  skills: [],
  industries: [],
  projects: [],
  bandwidth: 'Medium',
  comfort: { 'Intro call': 3, 'Executive pitch': 3, Workshop: 3, 'Deep dive': 3 },
  comfortNotes: {
    'Intro call': 'No backend profile loaded yet.',
    'Executive pitch': 'No backend profile loaded yet.',
    Workshop: 'No backend profile loaded yet.',
    'Deep dive': 'No backend profile loaded yet.',
  },
  desire: 'Neutral',
  travel: 'Regional',
  stretch: false,
  validation: 'Self-declared',
  managerNote: 'No manager note available.',
  updatedDaysAgo: 0,
}

function asRegion(value: string): Region {
  return regions.includes(value as Region) ? (value as Region) : 'SG'
}

function asBandwidth(value: string): Bandwidth {
  return ['Low', 'Medium', 'High'].includes(value) ? (value as Bandwidth) : 'Medium'
}

function asDesire(value: string | undefined): Desire {
  const desire = value || 'Neutral'
  return ['Actively seeking', 'Open selectively', 'Neutral', 'Limited interest'].includes(desire) ? (desire as Desire) : 'Neutral'
}

function asValidation(value: string): ValidationStatus {
  return ['Self-declared', 'Manager-validated', 'Community-validated'].includes(value) ? (value as ValidationStatus) : 'Self-declared'
}

function asTravel(value: string | undefined): Trainer['travel'] {
  const travel = value || 'Regional'
  return ['Local only', 'Regional', 'Global'].includes(travel) ? (travel as Trainer['travel']) : 'Regional'
}

function splitList(value: string | null | undefined) {
  return (value || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function daysAgo(value: string) {
  const parsed = new Date(value).getTime()
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.round((Date.now() - parsed) / 86_400_000))
}

function trainerFromApi(detail: TrainerDetailOut): Trainer {
  const comfort = { ...emptyTrainer.comfort }
  const comfortNotes = { ...emptyTrainer.comfortNotes }
  detail.comfort.forEach((item) => {
    if (meetingTypes.includes(item.meeting_type as MeetingType)) {
      comfort[item.meeting_type as MeetingType] = item.comfort_level
      comfortNotes[item.meeting_type as MeetingType] = item.confidence_note || 'Imported profile needs comfort detail.'
    }
  })

  const preferredSectors = splitList(detail.preference?.preferred_sectors)
  const projectSectors = detail.projects.map((project) => project.client_sector || '').filter(Boolean)
  const industriesForProfile = Array.from(new Set([...preferredSectors, ...projectSectors]))

  return {
    id: String(detail.id),
    name: detail.full_name,
    region: asRegion(detail.region),
    country: detail.country || 'Unspecified',
    role: detail.role_title || 'Trainer',
    seniority: detail.seniority_level || 'Senior',
    languages: splitList(detail.languages).length ? splitList(detail.languages) : ['English'],
    summary: detail.profile_summary || 'Imported backend profile.',
    skills: detail.skills.map((skill) => ({
      name: skill.skill_name,
      category: skill.skill_category || 'Imported',
      level: skill.proficiency_level,
      evidence: skill.evidence_note || skill.evidence_type || 'Backend profile evidence',
    })),
    industries: industriesForProfile,
    projects: detail.projects.map((project) => ({
      name: project.project_name,
      sector: project.client_sector || 'Unspecified',
      status: ['Active', 'Closing', 'Recent', 'Pipeline'].includes(project.project_status)
        ? (project.project_status as Project['status'])
        : 'Recent',
      commitment: asBandwidth(project.time_commitment),
      tags: splitList(project.relevance_tags),
    })),
    bandwidth: asBandwidth(detail.bandwidth),
    comfort,
    comfortNotes,
    desire: asDesire(detail.preference?.client_facing_desire),
    travel: asTravel(detail.preference?.travel_preference),
    stretch: Boolean(detail.preference?.stretch_interest),
    validation: asValidation(detail.validation_status),
    managerNote: detail.manager_note || 'No manager note provided.',
    updatedDaysAgo: daysAgo(detail.last_updated_at),
  }
}

async function fetchTrainerDataset() {
  const trainersList = await listTrainers()
  return Promise.all(trainersList.map((trainer) => getTrainer(trainer.id).then(trainerFromApi)))
}

function coverageFromApi(payload: CoverageOut): CoverageRow[] {
  return payload.rows.map((row) => ({
    topic: row.topic,
    cells: row.cells.map((cell) => ({
      region: cell.region,
      best: cell.best,
      count: cell.count,
      trainerNames: cell.trainer_names,
    })),
  }))
}

function trainerNamesForCoverageCell(source: Trainer[], topic: string, region: string) {
  return source
    .filter((trainer) => trainer.region === region && trainer.skills.some((skill) => normalize(skill.name) === normalize(topic)))
    .map((trainer) => trainer.name)
    .sort((left, right) => left.localeCompare(right))
}

function matchesFromApi(payload: MatchResponseOut, source: Trainer[]): MatchResult[] {
  return payload.results.map((result) => {
    const trainer = source.find((item) => item.id === String(result.trainer_id)) || {
      ...emptyTrainer,
      id: String(result.trainer_id),
      name: result.full_name,
      region: asRegion(result.region),
      role: result.role_title || 'Trainer',
    }

    return {
      trainer,
      score: result.score,
      reasons: result.reasons,
      caveats: result.caveats,
      parts: {
        skill: result.components.skill || 0,
        comfort: result.components.comfort || 0,
        industry: result.components.industry || 0,
        availability: result.components.availability || 0,
        region: result.components.region || 0,
        desire: result.components.desire || 0,
      },
    }
  })
}

function App() {
  const [request, setRequest] = useState<RequestState>(initialRequest)
  const [weights, setWeights] = useState<Weights>(defaultWeights)
  const [data, setData] = useState<Trainer[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [activeView, setActiveView] = useState<'matches' | 'coverage' | 'admin'>('matches')
  const [importNotice, setImportNotice] = useState('Connecting to backend')
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [apiMatches, setApiMatches] = useState<MatchResult[]>([])
  const [apiCoverageRows, setApiCoverageRows] = useState<CoverageRow[]>([])
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogGroup[]>(defaultSkillCatalog)
  const [savingWeights, setSavingWeights] = useState(false)
  const [customTopics, setCustomTopics] = useState<string[]>([])
  const [customRegions, setCustomRegions] = useState<string[]>([])
  const [customMeetingTypes, setCustomMeetingTypes] = useState<string[]>([])
  const [customIndustries, setCustomIndustries] = useState<string[]>([])
  const [customLanguages, setCustomLanguages] = useState<string[]>([])
  const effectiveRequest = useMemo(() => resolveRequest(request), [request])

  const localMatches = useMemo(() => calculateMatches(effectiveRequest, weights, data), [data, effectiveRequest, weights])
  const matches = apiStatus === 'online' ? apiMatches : localMatches
  const selected = data.find((trainer) => trainer.id === selectedId) || matches[0]?.trainer || data[0] || emptyTrainer
  const shortlist = matches.slice(0, 4)

  const missingFields = [
    effectiveRequest.topic ? '' : 'topic',
    effectiveRequest.region === 'Any' ? 'region' : '',
    effectiveRequest.meetingType === 'Any' ? 'meeting type' : '',
  ].filter(Boolean)

  const catalogTopics = useMemo(() => skillCatalog.flatMap((group) => group.skills), [skillCatalog])
  const catalogTopicSet = useMemo(() => new Set(catalogTopics), [catalogTopics])

  const localCoverageRows = catalogTopics.map((topic) => {
    const cells = regions.map((region) => {
      const regional = data.filter((trainer) => trainer.region === region)
      const trainerNames = trainerNamesForCoverageCell(data, topic, region)
      const best = Math.max(
        0,
        ...regional.map((trainer) => {
          const skill = trainer.skills.find((item) => item.name === topic)
          return skill ? skill.level : 0
        }),
      )
      return { region, best, count: trainerNames.length, trainerNames }
    })
    return { topic, cells }
  })
  const coverageRows = (apiStatus === 'online' ? apiCoverageRows : localCoverageRows).map((row) => ({
    ...row,
    cells: row.cells.map((cell) => {
      const trainerNames = cell.trainerNames ?? trainerNamesForCoverageCell(data, row.topic, cell.region)
      return { ...cell, count: trainerNames.length, trainerNames }
    }),
  }))
  const topicOptionGroups = useMemo(() => {
    const groups = new Map<string, string[]>()
    const addTopic = (category: string, topic: string) => {
      const displayTopic = displayCaseSkill(topic)
      if (!displayTopic) return
      groups.set(category, [...(groups.get(category) || []), displayTopic])
    }

    skillCatalog.forEach((group) => {
      group.skills.forEach((skill) => addTopic(group.category, skill))
    })
    data.forEach((trainer) => {
      trainer.skills.forEach((skill) => {
        if (!catalogTopicSet.has(skill.name)) addTopic(skill.category || 'Additional Skills', skill.name)
      })
    })
    customTopics.forEach((topic) => addTopic('Custom', topic))

    return Array.from(groups.entries())
      .map(([category, options]) => ({ category, options: uniqueSorted(options) }))
      .sort((left, right) => {
        const leftIndex = skillCategoryOrder.indexOf(left.category)
        const rightIndex = skillCategoryOrder.indexOf(right.category)
        return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex) || left.category.localeCompare(right.category)
      })
  }, [catalogTopicSet, customTopics, data, skillCatalog])
  const topicOptions = useMemo(() => topicOptionGroups.flatMap((group) => group.options), [topicOptionGroups])
  const regionOptions = useMemo(() => uniqueSorted([...regions, ...customRegions]), [customRegions])
  const meetingTypeOptions = useMemo(() => uniqueSorted([...meetingTypes, ...customMeetingTypes]), [customMeetingTypes])
  const industryOptions = useMemo(
    () => uniqueSorted([...industries, ...data.flatMap((trainer) => trainer.industries), ...customIndustries]),
    [customIndustries, data],
  )
  const languageOptions = useMemo(
    () => uniqueSorted(['English', 'German', 'Dutch', 'Spanish', 'Arabic', ...data.flatMap((trainer) => trainer.languages), ...customLanguages]),
    [customLanguages, data],
  )

  useEffect(() => {
    let cancelled = false

    async function loadBackend() {
      try {
        await getHealth()
        const [backendTrainers, scoringConfig, coverage, catalog] = await Promise.all([
          fetchTrainerDataset(),
          getScoringConfig(),
          getCoverage(),
          getSkillCatalog(),
        ])

        if (cancelled) return
        setApiStatus('online')
        setSkillCatalog(catalog.length ? catalog : defaultSkillCatalog)
        setData(backendTrainers)
        setSelectedId(backendTrainers[0]?.id || '')
        setWeights({
          skill: scoringConfig.skill,
          comfort: scoringConfig.comfort,
          industry: scoringConfig.industry,
          availability: scoringConfig.availability,
          region: scoringConfig.region,
          desire: scoringConfig.desire,
        })
        setApiCoverageRows(coverageFromApi(coverage))
        setImportNotice(
          backendTrainers.length
            ? `${backendTrainers.length} backend trainer profiles loaded`
            : 'Backend online. Import a trainer spreadsheet to begin.',
        )
        setImportErrors([])
      } catch {
        if (cancelled) return
        setApiStatus('offline')
        setSkillCatalog(defaultSkillCatalog)
        setData(demoTrainers)
        setSelectedId(demoTrainers[0].id)
        setImportNotice('Backend offline. Demo dataset loaded in the browser.')
        setImportErrors([])
      }
    }

    loadBackend()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refreshMatches() {
      if (apiStatus !== 'online') return

      try {
        const response = await matchTrainers({
          request: effectiveRequest.text,
          topic: effectiveRequest.topic,
          meeting_type: effectiveRequest.meetingType === 'Any' ? null : effectiveRequest.meetingType,
          industry: effectiveRequest.industry === 'Any' ? null : effectiveRequest.industry || null,
          region: effectiveRequest.region === 'Any' ? null : effectiveRequest.region,
          language: effectiveRequest.language || null,
          seniority: request.seniority === 'Any' ? null : request.seniority,
          stretch_mode: effectiveRequest.stretchMode,
          weights,
        })
        if (!cancelled) {
          const nextMatches = matchesFromApi(response, data)
          setApiMatches(nextMatches)
          if (!selectedId && nextMatches[0]) setSelectedId(nextMatches[0].trainer.id)
        }
      } catch {
        if (!cancelled) setImportNotice('Backend match failed. Check the API process and request data.')
      }
    }

    refreshMatches()

    return () => {
      cancelled = true
    }
  }, [apiStatus, data, effectiveRequest, request.seniority, selectedId, weights])

  async function saveWeights(nextWeights: Weights) {
    setWeights(nextWeights)
    if (apiStatus !== 'online') return

    setSavingWeights(true)
    try {
      await updateScoringConfig(nextWeights)
      setImportNotice('Backend scoring weights saved')
    } catch {
      setImportNotice('Could not save scoring weights to backend')
    } finally {
      setSavingWeights(false)
    }
  }

  function commitOther(field: 'topic' | 'region' | 'meetingType' | 'industry' | 'language') {
    const config = {
      topic: {
        value: request.otherTopic,
        setValues: setCustomTopics,
        patch: (value: string) => ({ topic: value, otherTopic: '' }),
      },
      region: {
        value: request.otherRegion,
        setValues: setCustomRegions,
        patch: (value: string) => ({ region: value as RequestState['region'], otherRegion: '' }),
      },
      meetingType: {
        value: request.otherMeetingType,
        setValues: setCustomMeetingTypes,
        patch: (value: string) => ({ meetingType: value as RequestState['meetingType'], otherMeetingType: '' }),
      },
      industry: {
        value: request.otherIndustry,
        setValues: setCustomIndustries,
        patch: (value: string) => ({ industry: value, otherIndustry: '' }),
      },
      language: {
        value: request.otherLanguage,
        setValues: setCustomLanguages,
        patch: (value: string) => ({ language: value, otherLanguage: '' }),
      },
    }[field]
    const rawValue = config.value.trim()
    const value = field === 'topic' || field === 'industry' ? displayCaseSkill(rawValue) : rawValue
    if (!value) return
    config.setValues((current) => uniqueSorted([...current, value]))
    setRequest((current) => ({ ...current, ...config.patch(value) }))
  }

  function handleOtherKeyDown(event: React.KeyboardEvent<HTMLInputElement>, field: 'topic' | 'region' | 'meetingType' | 'industry' | 'language') {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitOther(field)
    }
  }

  async function handleRequirementUpload(file: File) {
    setImportNotice('Comparing requirement document to backend trainers')
    try {
      const [response, backendTrainers] = await Promise.all([compareRequirement(file), fetchTrainerDataset()])
      const inferred = response.inferred_request
      const nextRequest: RequestState = {
        text: response.extracted_text_preview,
        topic: topicOptions.includes(inferred.topic) ? inferred.topic : 'Other',
        otherTopic: topicOptions.includes(inferred.topic) ? '' : inferred.topic,
        region: inferred.region && regionOptions.includes(inferred.region) ? (inferred.region as RequestState['region']) : inferred.region ? 'Other' : 'Any',
        otherRegion: inferred.region && !regions.includes(inferred.region as Region) ? inferred.region : '',
        meetingType: inferred.meeting_type && meetingTypeOptions.includes(inferred.meeting_type) ? (inferred.meeting_type as RequestState['meetingType']) : inferred.meeting_type ? 'Other' : 'Any',
        otherMeetingType:
          inferred.meeting_type && !meetingTypes.includes(inferred.meeting_type as MeetingType)
            ? inferred.meeting_type
            : '',
        industry: inferred.industry && industryOptions.includes(inferred.industry) ? inferred.industry : inferred.industry ? 'Other' : request.industry,
        otherIndustry: inferred.industry && !industryOptions.includes(inferred.industry) ? inferred.industry : '',
        language: inferred.language && languageOptions.includes(inferred.language) ? inferred.language : inferred.language ? 'Other' : 'English',
        otherLanguage: inferred.language && !languageOptions.includes(inferred.language) ? inferred.language : '',
        seniority: inferred.seniority || 'Any',
        stretchMode: inferred.stretch_mode,
      }
      setApiStatus('online')
      setData(backendTrainers)
      setRequest(nextRequest)
      setApiMatches(matchesFromApi(response.match, backendTrainers))
      setSelectedId(response.match.results[0] ? String(response.match.results[0].trainer_id) : '')
      setImportNotice(`Compared ${file.name} using ${inferred.topic}${inferred.region ? ` in ${inferred.region}` : ''}`)
      setImportErrors([])
      setActiveView('matches')
    } catch (error) {
      setImportNotice('Requirement comparison failed')
      setImportErrors([error instanceof Error ? error.message : 'Upload a readable .docx, .pdf, or .txt requirement document.'])
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ATEM</p>
          <h1>Agent for Trainer Expert Match</h1>
        </div>
        <div className="topbar-actions" aria-label="Data actions">
          <label className="file-action secondary-file-action">
            Upload requirement
            <input
              accept=".docx,.pdf,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                handleRequirementUpload(file).finally(() => {
                  event.target.value = ''
                })
              }}
            />
          </label>
          <label className="file-action">
            Import Excel/CSV
            <input
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setImportNotice('Uploading trainer spreadsheet to backend')

                importTrainers(file)
                  .then(async (result) => {
                    const [backendTrainers, coverage] = await Promise.all([fetchTrainerDataset(), getCoverage()])
                    setApiStatus('online')
                    setData(backendTrainers)
                    setSelectedId(backendTrainers[0]?.id || '')
                    setApiCoverageRows(coverageFromApi(coverage))
                    const importedCount = result.created_count + result.updated_count
                    const errorSuffix = result.error_count ? ` with ${result.error_count} row errors` : ''
                    setImportNotice(`${importedCount} backend profiles imported${errorSuffix}`)
                    setImportErrors(
                      result.errors.map((error) => `Row ${error.row_number} ${error.field}: ${error.message}`),
                    )
                  })
                  .catch(() => {
                    const isCsv = file.name.toLowerCase().endsWith('.csv')
                    const reader = isCsv ? file.text().then(trainersFromCsv) : trainersFromSpreadsheet(file)

                    reader
                      .then((imported) => {
                        if (imported.length) {
                          setApiStatus('offline')
                          setData(imported)
                          setSelectedId(imported[0].id)
                          setImportNotice(`${imported.length} profiles loaded locally. Backend import failed.`)
                          setImportErrors([])
                        } else {
                          setImportNotice('No trainer profiles found in the selected file')
                          setImportErrors([])
                        }
                      })
                      .catch(() => {
                        setImportNotice('Import failed. Check the first sheet has a header row.')
                        setImportErrors([])
                      })
                  })
                  .finally(() => {
                    event.target.value = ''
                  })
              }}
            />
          </label>
          <button type="button" className="secondary-button" onClick={() => exportCsv(data)}>
            Export CSV
          </button>
        </div>
      </header>

      <section className="agent-band" aria-label="Agent workspace">
        <div className="request-panel">
          <label htmlFor="request">Meeting request</label>
          <textarea
            id="request"
            value={request.text}
            onChange={(event) => setRequest(parseRequestText(event.target.value, request))}
          />
          <div className="prompt-row" aria-label="Prompt examples">
            {[
              'Cloud workshop in SG for banking',
              'Executive cyber pitch for banking in NA',
              'Stretch candidate for data in UK',
            ].map((prompt) => (
              <button
                type="button"
                className="ghost-button"
                key={prompt}
                onClick={() => setRequest(parseRequestText(prompt, request))}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="agent-card">
          <span className="status-dot" aria-hidden="true" />
          <strong>{apiStatus === 'checking' ? 'Connecting' : missingFields.length ? 'Clarify request' : 'Ready to rank'}</strong>
          <p>
            {apiStatus === 'offline'
              ? 'FastAPI is not reachable, so this session is using the browser demo dataset.'
              : missingFields.length
              ? `Add ${missingFields.join(', ')} to improve the shortlist.`
              : `Ranking ${data.length} profiles using skill, comfort, industry, availability, region, and appetite.`}
          </p>
          <p className="notice">{importNotice}</p>
          {importErrors.length > 0 && (
            <ul className="import-errors" aria-label="Import row errors">
              {importErrors.slice(0, 4).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="filter-bar" aria-label="Structured filters">
        <label>
          Topic
          <select value={request.topic} onChange={(event) => setRequest({ ...request, topic: event.target.value })}>
            {topicOptionGroups.map((group) => (
              <optgroup label={group.category} key={group.category}>
                {group.options.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </optgroup>
            ))}
            <option>Other</option>
          </select>
          {request.topic === 'Other' && (
            <input
              className="other-input"
              placeholder="Enter topic"
              value={request.otherTopic}
              onChange={(event) => setRequest({ ...request, otherTopic: event.target.value })}
              onBlur={() => commitOther('topic')}
              onKeyDown={(event) => handleOtherKeyDown(event, 'topic')}
            />
          )}
        </label>
        <label>
          Region
          <select value={request.region} onChange={(event) => setRequest({ ...request, region: event.target.value as RequestState['region'] })}>
            <option>Any</option>
            {regionOptions.map((region) => (
              <option key={region}>{region}</option>
            ))}
            <option>Other</option>
          </select>
          {request.region === 'Other' && (
            <input
              className="other-input"
              placeholder="Enter region/location"
              value={request.otherRegion}
              onChange={(event) => setRequest({ ...request, otherRegion: event.target.value })}
              onBlur={() => commitOther('region')}
              onKeyDown={(event) => handleOtherKeyDown(event, 'region')}
            />
          )}
        </label>
        <label>
          Meeting type
          <select
            value={request.meetingType}
            onChange={(event) => setRequest({ ...request, meetingType: event.target.value as RequestState['meetingType'] })}
          >
            <option>Any</option>
            {meetingTypeOptions.map((type) => (
              <option key={type}>{type}</option>
            ))}
            <option>Other</option>
          </select>
          {request.meetingType === 'Other' && (
            <input
              className="other-input"
              placeholder="Enter meeting type"
              value={request.otherMeetingType}
              onChange={(event) => setRequest({ ...request, otherMeetingType: event.target.value })}
              onBlur={() => commitOther('meetingType')}
              onKeyDown={(event) => handleOtherKeyDown(event, 'meetingType')}
            />
          )}
        </label>
        <label>
          Industry
          <select value={request.industry} onChange={(event) => setRequest({ ...request, industry: event.target.value })}>
            <option>Any</option>
            {industryOptions.map((industry) => (
              <option key={industry}>{industry}</option>
            ))}
            <option>Other</option>
          </select>
          {request.industry === 'Other' && (
            <input
              className="other-input"
              placeholder="Enter industry"
              value={request.otherIndustry}
              onChange={(event) => setRequest({ ...request, otherIndustry: event.target.value })}
              onBlur={() => commitOther('industry')}
              onKeyDown={(event) => handleOtherKeyDown(event, 'industry')}
            />
          )}
        </label>
        <label>
          Language
          <select value={request.language} onChange={(event) => setRequest({ ...request, language: event.target.value })}>
            {languageOptions.map((language) => (
              <option key={language}>{language}</option>
            ))}
            <option>Other</option>
          </select>
          {request.language === 'Other' && (
            <input
              className="other-input"
              placeholder="Enter language"
              value={request.otherLanguage}
              onChange={(event) => setRequest({ ...request, otherLanguage: event.target.value })}
              onBlur={() => commitOther('language')}
              onKeyDown={(event) => handleOtherKeyDown(event, 'language')}
            />
          )}
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={request.stretchMode}
            onChange={(event) => setRequest({ ...request, stretchMode: event.target.checked })}
          />
          Stretch mode
        </label>
      </section>

      <nav className="tabs" aria-label="Primary views">
        {[
          ['matches', 'Match results'],
          ['coverage', 'Coverage analytics'],
          ['admin', 'Weights'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={activeView === id ? 'tab active' : 'tab'}
            onClick={() => setActiveView(id as typeof activeView)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeView === 'matches' && (
        <section className="workspace-grid">
          <div className="results-panel" aria-label="Ranked shortlist">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ranked shortlist</p>
                <h2>Best fits for this request</h2>
              </div>
              <span>{matches.length} matches</span>
            </div>
            <div className="result-list">
              {matches.map((match, index) => (
                <button
                  type="button"
                  className={selected.id === match.trainer.id ? 'result-card selected' : 'result-card'}
                  key={match.trainer.id}
                  onClick={() => setSelectedId(match.trainer.id)}
                >
                  <span className="rank">#{index + 1}</span>
                  <span className="score">{match.score}</span>
                  <span className="candidate">
                    <strong>{match.trainer.name}</strong>
                    <small>
                      {match.trainer.region} · {match.trainer.role}
                    </small>
                  </span>
                  <span className={`badge ${match.trainer.validation === 'Self-declared' ? 'warning' : 'ok'}`}>
                    {match.trainer.validation}
                  </span>
                  <span className="reason-row">
                    {match.reasons.map((reason) => (
                      <em key={reason}>{reason}</em>
                    ))}
                  </span>
                  {match.caveats.length > 0 && <span className="caveat">{match.caveats.join(' / ')}</span>}
                </button>
              ))}
            </div>
          </div>

          <aside className="profile-panel" aria-label="Trainer profile">
            <div className="profile-header">
              <div>
                <p className="eyebrow">Profile detail</p>
                <h2>{selected.name}</h2>
                <p>{selected.summary}</p>
              </div>
              <span className="profile-score">{matches.find((match) => match.trainer.id === selected.id)?.score || 0}</span>
            </div>
            <div className="profile-meta">
              <span>{selected.country}</span>
              <span>{selected.seniority}</span>
              <span>{selected.languages.join(', ')}</span>
              <span>{selected.desire}</span>
            </div>

            <div className="profile-section">
              <h3>Skills evidence</h3>
              {selected.skills.map((skill) => (
                <div className="skill-row" key={`${skill.category}-${skill.name}`}>
                  <span>
                    <strong>{skill.name}</strong>
                    <small>{skill.category} - {skill.evidence}</small>
                  </span>
                  <meter min="0" max="5" value={skill.level} />
                </div>
              ))}
            </div>

            <div className="profile-section">
              <h3>Meeting comfort</h3>
              <div className="comfort-grid">
                {meetingTypes.map((type) => (
                  <div key={type}>
                    <span>{type}</span>
                    <strong>{selected.comfort[type]}/5</strong>
                    <small>{selected.comfortNotes[type]}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-section">
              <h3>Project context</h3>
              {selected.projects.map((project) => (
                <article className="project-card" key={project.name}>
                  <strong>{project.name}</strong>
                  <span>
                    {project.sector} · {project.status} · {project.commitment} load
                  </span>
                </article>
              ))}
            </div>

            <div className="manager-note">
              <strong>Manager note</strong>
              <p>{selected.managerNote}</p>
            </div>
          </aside>
        </section>
      )}

      {activeView === 'coverage' && (
        <section className="analytics-grid">
          <div className="coverage-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Coverage matrix</p>
                <h2>Capability by region</h2>
              </div>
              <span>Best skill depth</span>
            </div>
            <div className="matrix" role="table" aria-label="Capability heat map">
              <div className="matrix-row header" role="row">
                <span role="columnheader">Topic</span>
                {regions.map((region) => (
                  <span role="columnheader" key={region}>
                    {region}
                  </span>
                ))}
              </div>
              {coverageRows.map((row) => (
                <div className="matrix-row" role="row" key={row.topic}>
                  <strong role="cell">{row.topic}</strong>
                  {row.cells.map((cell) => {
                    const trainerNames = cell.trainerNames || []
                    const trainerSummary = trainerNames.length
                      ? `Trainers: ${trainerNames.join(', ')}`
                      : 'No trainer profiles'
                    return (
                      <span
                        aria-label={`${row.topic}, ${cell.region}: ${cell.best ? `${cell.best} out of 5` : 'Gap'}, ${trainerSummary}`}
                        className={`heat heat-${cell.best}`}
                        key={cell.region}
                        role="cell"
                        tabIndex={trainerNames.length ? 0 : undefined}
                        title={trainerSummary}
                      >
                        {cell.best ? `${cell.best}/5` : 'Gap'}
                        <small>{cell.count} {cell.count === 1 ? 'profile' : 'profiles'}</small>
                        {trainerNames.length > 0 && (
                          <span className="heat-tooltip" role="tooltip">
                            <strong>{trainerNames.length === 1 ? 'Trainer' : 'Trainers'}</strong>
                            {trainerNames.map((name) => (
                              <span key={name}>{name}</span>
                            ))}
                          </span>
                        )}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="coverage-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Saved shortlist</p>
                <h2>Current top candidates</h2>
              </div>
            </div>
            <div className="compact-list">
              {shortlist.map((match) => (
                <button type="button" key={match.trainer.id} onClick={() => {
                  setSelectedId(match.trainer.id)
                  setActiveView('matches')
                }}>
                  <strong>{match.trainer.name}</strong>
                  <span>{match.score} fit · {match.trainer.desire}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeView === 'admin' && (
        <section className="admin-panel" aria-label="Matching weight configuration">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin configuration</p>
              <h2>Matching weights</h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => saveWeights(defaultWeights)}>
              {savingWeights ? 'Saving' : 'Reset'}
            </button>
          </div>
          <div className="weight-grid">
            {(Object.keys(weights) as (keyof Weights)[]).map((key) => (
              <label key={key}>
                <span>
                  {key}
                  <strong>{weights[key]}</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights[key]}
                  onChange={(event) => saveWeights({ ...weights, [key]: Number(event.target.value) })}
                />
              </label>
            ))}
          </div>
          <div className="rules-panel">
            <h3>Business rules reflected in MVP</h3>
            <p>Language acts as a hard filter. High project load reduces rank. Self-declared profiles remain searchable but are flagged. Stretch mode increases the value of appetite and development interest.</p>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
