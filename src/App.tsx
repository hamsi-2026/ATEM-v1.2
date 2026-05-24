import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

type Region = 'APAC' | 'EMEA' | 'Americas' | 'Benelux'
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
  region: 'Any' | Region
  meetingType: 'Any' | MeetingType
  industry: string
  language: string
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

const meetingTypes: MeetingType[] = ['Intro call', 'Executive pitch', 'Workshop', 'Deep dive']
const regions: Region[] = ['APAC', 'EMEA', 'Americas', 'Benelux']
const industries = ['Banking', 'Retail', 'Public sector', 'Manufacturing', 'Technology', 'Healthcare']
const topics = [
  'AI governance',
  'Cloud modernisation',
  'Data analytics',
  'Cybersecurity',
  'Change management',
  'Automation',
]

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
  topic: 'AI governance',
  region: 'EMEA',
  meetingType: 'Intro call',
  industry: 'Retail',
  language: 'English',
  seniority: 'Any',
  stretchMode: false,
}

const trainers: Trainer[] = [
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
      { name: 'AI governance', category: 'AI', level: 5, evidence: 'Led retail AI risk workshops' },
      { name: 'Change management', category: 'Adoption', level: 4, evidence: 'Delivered enablement playbooks' },
      { name: 'Data analytics', category: 'Data', level: 3, evidence: 'Built analytics training modules' },
    ],
    industries: ['Retail', 'Manufacturing', 'Technology'],
    projects: [
      {
        name: 'Retail AI readiness program',
        sector: 'Retail',
        status: 'Closing',
        commitment: 'Medium',
        tags: ['AI governance', 'Executive pitch'],
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
    region: 'APAC',
    country: 'Singapore',
    role: 'Senior Cloud Trainer',
    seniority: 'Senior',
    languages: ['English', 'Tamil'],
    summary: 'Cloud modernisation trainer who wants more client exposure and has strong workshop delivery evidence.',
    skills: [
      { name: 'Cloud modernisation', category: 'Cloud', level: 5, evidence: 'Migrated enterprise lab curriculum' },
      { name: 'Automation', category: 'Engineering', level: 4, evidence: 'Built platform automation modules' },
      { name: 'Cybersecurity', category: 'Security', level: 3, evidence: 'Cloud security foundations certified' },
    ],
    industries: ['Technology', 'Banking', 'Public sector'],
    projects: [
      {
        name: 'APAC cloud academy',
        sector: 'Technology',
        status: 'Active',
        commitment: 'Medium',
        tags: ['Cloud modernisation', 'Workshop'],
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
    region: 'Americas',
    country: 'United States',
    role: 'Cybersecurity Enablement Lead',
    seniority: 'Lead',
    languages: ['English', 'Spanish'],
    summary: 'Cybersecurity specialist with banking and healthcare experience, strongest in executive briefings.',
    skills: [
      { name: 'Cybersecurity', category: 'Security', level: 5, evidence: 'CISO simulation program owner' },
      { name: 'AI governance', category: 'AI', level: 3, evidence: 'AI risk controls module' },
      { name: 'Data analytics', category: 'Data', level: 3, evidence: 'Threat analytics course' },
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
    region: 'Benelux',
    country: 'Netherlands',
    role: 'Data and AI Trainer',
    seniority: 'Senior',
    languages: ['English', 'Dutch', 'German'],
    summary: 'Data analytics and AI trainer with high appetite for more client-facing work.',
    skills: [
      { name: 'Data analytics', category: 'Data', level: 5, evidence: 'Analytics academy lead' },
      { name: 'AI governance', category: 'AI', level: 4, evidence: 'Responsible AI client labs' },
      { name: 'Automation', category: 'Engineering', level: 3, evidence: 'Workflow automation labs' },
    ],
    industries: ['Retail', 'Public sector', 'Banking'],
    projects: [
      {
        name: 'Public sector data literacy',
        sector: 'Public sector',
        status: 'Active',
        commitment: 'High',
        tags: ['Data analytics', 'AI governance'],
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
      { name: 'Change management', category: 'Adoption', level: 5, evidence: 'Regional transformation toolkit owner' },
      { name: 'Cloud modernisation', category: 'Cloud', level: 3, evidence: 'Cloud adoption workshops' },
      { name: 'Automation', category: 'Engineering', level: 4, evidence: 'Process automation bootcamps' },
    ],
    industries: ['Public sector', 'Manufacturing', 'Technology'],
    projects: [
      {
        name: 'Regional operating model rollout',
        sector: 'Public sector',
        status: 'Closing',
        commitment: 'Low',
        tags: ['Change management', 'Workshop'],
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
      { name: 'AI governance', category: 'AI', level: 4, evidence: 'AI controls reference architecture' },
      { name: 'Automation', category: 'Engineering', level: 5, evidence: 'Enterprise automation academy' },
      { name: 'Cloud modernisation', category: 'Cloud', level: 4, evidence: 'AI platform migration labs' },
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
  if (haystack.includes('singapore') || haystack.includes('apac')) next.region = 'APAC'
  if (haystack.includes('netherlands') || haystack.includes('benelux')) next.region = 'Benelux'
  if (haystack.includes('intro') || haystack.includes('discovery')) next.meetingType = 'Intro call'
  if (haystack.includes('pitch') || haystack.includes('executive')) next.meetingType = 'Executive pitch'
  if (haystack.includes('workshop')) next.meetingType = 'Workshop'
  if (haystack.includes('deep dive') || haystack.includes('technical')) next.meetingType = 'Deep dive'
  if (haystack.includes('stretch') || haystack.includes('development') || haystack.includes('more client')) {
    next.stretchMode = true
  }

  return next
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
      const comfortScore = request.meetingType === 'Any' ? 70 : trainer.comfort[request.meetingType] * 20
      const industryScore = request.industry
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
          : `${request.meetingType} comfort rated ${trainer.comfort[request.meetingType]}/5`,
        request.industry && industryScore > 80 ? `${request.industry} evidence present` : `${trainer.region} coverage with ${trainer.travel.toLowerCase()} travel`,
      ]

      const caveats = [
        trainer.bandwidth === 'High' ? 'High current project load' : '',
        trainer.validation === 'Self-declared' ? 'Readiness needs validation' : '',
        trainer.updatedDaysAgo > 60 ? 'Profile is stale' : '',
        request.meetingType !== 'Any' && trainer.comfort[request.meetingType] <= 2 ? 'Should not lead this meeting type alone' : '',
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
          return {
            name: name.trim(),
            category: 'Imported',
            level: Math.max(1, Math.min(5, Number(rating) || 3)),
            evidence: 'Imported from trainer spreadsheet',
          }
        })
      : [{ name: value('topic') || 'General training', category: 'Imported', level: 3, evidence: 'Imported row' }]

    return {
      id: `csv-${index}`,
      name: value('name') || value('full_name') || `Imported trainer ${index + 1}`,
      region: (value('region') as Region) || 'APAC',
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

function App() {
  const [request, setRequest] = useState<RequestState>(initialRequest)
  const [weights, setWeights] = useState<Weights>(defaultWeights)
  const [data, setData] = useState<Trainer[]>(trainers)
  const [selectedId, setSelectedId] = useState(trainers[0].id)
  const [activeView, setActiveView] = useState<'matches' | 'coverage' | 'admin'>('matches')
  const [importNotice, setImportNotice] = useState('Sample dataset loaded')

  const matches = useMemo(() => calculateMatches(request, weights, data), [data, request, weights])
  const selected = data.find((trainer) => trainer.id === selectedId) || matches[0]?.trainer || data[0]
  const shortlist = matches.slice(0, 4)

  const missingFields = [
    request.topic ? '' : 'topic',
    request.region === 'Any' ? 'region' : '',
    request.meetingType === 'Any' ? 'meeting type' : '',
  ].filter(Boolean)

  const coverageRows = topics.map((topic) => {
    const cells = regions.map((region) => {
      const regional = data.filter((trainer) => trainer.region === region)
      const best = Math.max(
        0,
        ...regional.map((trainer) => {
          const skill = trainer.skills.find((item) => item.name === topic)
          return skill ? skill.level : 0
        }),
      )
      return { region, best, count: regional.filter((trainer) => trainer.skills.some((skill) => skill.name === topic)).length }
    })
    return { topic, cells }
  })

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Trainer expert match agent</p>
          <h1>Find the right trainer for the meeting.</h1>
        </div>
        <div className="topbar-actions" aria-label="Data actions">
          <label className="file-action">
            Import Excel/CSV
            <input
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const isCsv = file.name.toLowerCase().endsWith('.csv')
                const reader = isCsv ? file.text().then(trainersFromCsv) : trainersFromSpreadsheet(file)

                reader.then((imported) => {
                  if (imported.length) {
                    setData(imported)
                    setSelectedId(imported[0].id)
                    setImportNotice(`${imported.length} imported trainer profiles loaded`)
                  } else {
                    setImportNotice('No trainer profiles found in the selected file')
                  }
                }).catch(() => {
                  setImportNotice('Import failed. Check the first sheet has a header row.')
                }).finally(() => {
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
              'Cloud workshop in APAC for banking',
              'Executive cyber pitch for banking in Americas',
              'Stretch candidate for data in Benelux',
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
          <strong>{missingFields.length ? 'Clarify request' : 'Ready to rank'}</strong>
          <p>
            {missingFields.length
              ? `Add ${missingFields.join(', ')} to improve the shortlist.`
              : `Ranking ${data.length} profiles using skill, comfort, industry, availability, region, and appetite.`}
          </p>
          <p className="notice">{importNotice}</p>
        </div>
      </section>

      <section className="filter-bar" aria-label="Structured filters">
        <label>
          Topic
          <select value={request.topic} onChange={(event) => setRequest({ ...request, topic: event.target.value })}>
            {topics.map((topic) => (
              <option key={topic}>{topic}</option>
            ))}
          </select>
        </label>
        <label>
          Region
          <select value={request.region} onChange={(event) => setRequest({ ...request, region: event.target.value as RequestState['region'] })}>
            <option>Any</option>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </label>
        <label>
          Meeting type
          <select
            value={request.meetingType}
            onChange={(event) => setRequest({ ...request, meetingType: event.target.value as RequestState['meetingType'] })}
          >
            <option>Any</option>
            {meetingTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Industry
          <select value={request.industry} onChange={(event) => setRequest({ ...request, industry: event.target.value })}>
            {industries.map((industry) => (
              <option key={industry}>{industry}</option>
            ))}
          </select>
        </label>
        <label>
          Language
          <select value={request.language} onChange={(event) => setRequest({ ...request, language: event.target.value })}>
            <option>English</option>
            <option>German</option>
            <option>Dutch</option>
            <option>Spanish</option>
            <option>Arabic</option>
          </select>
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
                <div className="skill-row" key={skill.name}>
                  <span>
                    <strong>{skill.name}</strong>
                    <small>{skill.evidence}</small>
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
                  {row.cells.map((cell) => (
                    <span className={`heat heat-${cell.best}`} role="cell" key={cell.region}>
                      {cell.best ? `${cell.best}/5` : 'Gap'}
                      <small>{cell.count} profiles</small>
                    </span>
                  ))}
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
            <button type="button" className="secondary-button" onClick={() => setWeights(defaultWeights)}>
              Reset
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
                  onChange={(event) => setWeights({ ...weights, [key]: Number(event.target.value) })}
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
