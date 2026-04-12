import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  CommitteeItemType,
  PauseType,
  PrismaClient,
  RepeatType,
  ThesisLanguage,
  TimeScheduleType
} from './generated/client/client'
import type { Prisma, StudyLanguage, StudyProgramType } from './generated/client/client'
import {
  EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME,
  EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE
} from '../shared/constants/editor'

interface ValidSpecializationTriple {
  studyProgramType: StudyProgramType
  studyProgramName: string
  studyLanguage: StudyLanguage
  specializationCode: string
  specializationName: string
}

interface ScheduleSeedConfig {
  index: number
  type: TimeScheduleType
}

interface StudentDraftContext {
  committeeLabel: string
  scheduleIndex: number
  committeeIndex: number
  studentIndex: number
  globalStudentIndex: number
  triple: ValidSpecializationTriple
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
})

const TOTAL_SCHEDULES = 8
const AUTO_SCHEDULES = 6
const IMPORTED_TEACHERS_COUNT = 120
const CUSTOM_TEACHERS_COUNT = 8

const BASE_COMMITTEE_DATE = new Date(Date.UTC(2026, 4, 28, 0, 0, 0))
const BASE_SCHEDULE_TIMESTAMP = new Date(Date.UTC(2026, 3, 6, 1, 17, 0))

const START_MINUTE_SEQUENCE = [
  295, 450, 495, 510, 525, 540, 555, 570, 600, 660, 720, 780, 900, 1020, 1140, 1315
] as const
const ROOM_SEQUENCE = ['TH:A-1435', 'TH:A-1247', 'TH:A-1455', 'TH:A-949', 'TH:A-1452', 'TH:A-1100'] as const
const PREPARATION_ROOM_SEQUENCE = ['TH:A-1949', 'TH:A-949', 'TH:A-1435'] as const

const THESIS_LANGUAGE_COVERAGE_SEQUENCE = [ThesisLanguage.CZECH, ThesisLanguage.ENGLISH, ThesisLanguage.SLOVAK] as const

const REPEAT_TYPE_COVERAGE_SEQUENCE = [
  RepeatType.NONE,
  RepeatType.THESIS_DEFENSE,
  RepeatType.ORAL_EXAM,
  RepeatType.BOTH,
  RepeatType.UNKNOWN
] as const

const TITLE_BEFORE_SEQUENCE = [null, 'Bc.', 'Ing.', 'Mgr.', 'Bc. Ing.'] as const
const TITLE_AFTER_SEQUENCE = [null, null, null, 'DiS.', null, 'MBA'] as const

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const random = createSeededRandom(20260412)

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

function shuffleInPlace<T>(values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(0, index)
    const temporary = values[index]!
    values[index] = values[randomIndex]!
    values[randomIndex] = temporary
  }

  return values
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

function formatScheduleStamp(date: Date): string {
  return `${pad2(date.getUTCDate())}.${pad2(date.getUTCMonth() + 1)}.${date.getUTCFullYear()} ${pad2(
    date.getUTCHours()
  )}:${pad2(date.getUTCMinutes())}`
}

function normalizeLookupKey(canonicalName: string): string {
  const tokens = canonicalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .sort((left, right) => left.localeCompare(right))

  return tokens.join(' ')
}

function buildProgramLanguageLookup(): Map<string, StudyLanguage> {
  const lookup = new Map<string, StudyLanguage>()

  for (const [programType, byLanguage] of Object.entries(EDITOR_STUDY_PROGRAM_NAME_OPTIONS_BY_TYPE) as [
    StudyProgramType,
    Record<StudyLanguage, string[]>
  ][]) {
    for (const [language, programNames] of Object.entries(byLanguage) as [StudyLanguage, string[]][]) {
      for (const programName of programNames) {
        lookup.set(`${programType}|${programName}`, language)
      }
    }
  }

  return lookup
}

function buildValidSpecializationTriples(): ValidSpecializationTriple[] {
  const programLanguageLookup = buildProgramLanguageLookup()
  const triples: ValidSpecializationTriple[] = []

  for (const [programType, byProgramName] of Object.entries(
    EDITOR_SPECIALIZATION_OPTIONS_BY_TYPE_AND_STUDY_PROGRAM_NAME
  ) as [StudyProgramType, Record<string, { specializationCode: string; specializationName: string }[]>][]) {
    for (const [programName, specializations] of Object.entries(byProgramName)) {
      const studyLanguage = programLanguageLookup.get(`${programType}|${programName}`)
      if (!studyLanguage) {
        throw new Error(`Missing study language mapping for ${programType}|${programName}`)
      }

      for (const specialization of specializations) {
        triples.push({
          studyProgramType: programType,
          studyProgramName: programName,
          studyLanguage,
          specializationCode: specialization.specializationCode,
          specializationName: specialization.specializationName
        })
      }
    }
  }

  return triples
}

function buildScheduleConfigs(): ScheduleSeedConfig[] {
  return Array.from({ length: TOTAL_SCHEDULES }, (_, index) => ({
    index,
    type: index < AUTO_SCHEDULES ? TimeScheduleType.AUTO : TimeScheduleType.MANUAL
  }))
}

function buildScheduleName(config: ScheduleSeedConfig): string {
  const sequenceNumber = config.index + 1
  if (config.type === TimeScheduleType.MANUAL) {
    return `Manualni harmonogram ${sequenceNumber}`
  }

  const timestamp = new Date(BASE_SCHEDULE_TIMESTAMP)
  timestamp.setUTCDate(BASE_SCHEDULE_TIMESTAMP.getUTCDate() + config.index)
  timestamp.setUTCHours(1 + (config.index % 23), 17, 0, 0)
  return `Automaticky harmonogram ${sequenceNumber} [${formatScheduleStamp(timestamp)}]`
}

function buildCommitteeDate(committeeGlobalIndex: number): Date {
  const date = new Date(BASE_COMMITTEE_DATE)
  // Small day span forces multiple committees into the same date.
  date.setUTCDate(BASE_COMMITTEE_DATE.getUTCDate() + (committeeGlobalIndex % 6))
  return date
}

function buildInvigilators(committeeGlobalIndex: number, committeeLabel: string): string[] {
  const pattern = committeeGlobalIndex % 10
  if (pattern < 8) {
    return []
  }

  if (pattern === 8) {
    return [`Dozor ${committeeLabel}-1`]
  }

  return [`Dozor ${committeeLabel}-1`, `Dozor ${committeeLabel}-2`]
}

function resolvePauseDurationMinutes(pauseType: PauseType): number {
  return pauseType === PauseType.LUNCH ? 60 : 20
}

function resolvePauseLabel(pauseType: PauseType): string {
  return pauseType === PauseType.LUNCH ? 'Obed' : 'Prestavka'
}

function buildStudentDraft(context: StudentDraftContext) {
  const coverageIndex = context.globalStudentIndex - 1
  const hasEmail = coverageIndex % 3 === 0
  const titlesBefore = TITLE_BEFORE_SEQUENCE[coverageIndex % TITLE_BEFORE_SEQUENCE.length] ?? null
  const titlesAfter = TITLE_AFTER_SEQUENCE[coverageIndex % TITLE_AFTER_SEQUENCE.length] ?? null

  return {
    firstName: `Student${context.globalStudentIndex}`,
    lastName: `Demo${(context.globalStudentIndex % 251) + 1}`,
    email: hasEmail ? `student.${context.globalStudentIndex}@example.test` : null,
    titlesBefore,
    titlesAfter,
    thesisTitleLocal: `Anonymizovane tema ${context.scheduleIndex + 1}-${context.committeeIndex + 1}-${context.studentIndex + 1}`,
    thesisTitleEn: `Anonymized thesis ${context.scheduleIndex + 1}-${context.committeeIndex + 1}-${context.studentIndex + 1}`,
    thesisLanguage: THESIS_LANGUAGE_COVERAGE_SEQUENCE[coverageIndex % THESIS_LANGUAGE_COVERAGE_SEQUENCE.length]!,
    supervisorName: `Supervisor ${context.committeeLabel}-${context.studentIndex + 1}`,
    reviewerName: `Reviewer ${context.committeeLabel}-${context.studentIndex + 1}`,
    additionalSupervisorName: coverageIndex % 97 === 0 ? `Additional Supervisor ${context.committeeLabel}` : null,
    additionalReviewerName: coverageIndex % 41 === 0 ? `Additional Reviewer ${context.committeeLabel}` : null,
    studyProgramName: context.triple.studyProgramName,
    studyProgramType: context.triple.studyProgramType,
    specializationName: context.triple.specializationName,
    specializationCode: context.triple.specializationCode,
    studyLanguage: context.triple.studyLanguage,
    repeatType: REPEAT_TYPE_COVERAGE_SEQUENCE[coverageIndex % REPEAT_TYPE_COVERAGE_SEQUENCE.length]!,
    prepareMinutes: coverageIndex % 53 === 0 ? 50 : 45,
    examMinutes: coverageIndex % 17 === 0 ? 30 : 15
  }
}

function buildTeacherDictionaryRows() {
  const imported = Array.from({ length: IMPORTED_TEACHERS_COUNT }, (_, index) => {
    const label = (index + 1).toString().padStart(4, '0')
    const canonicalName = `Ing. Teacher ${label} Ph.D.`
    return {
      canonicalName,
      normalizedLookupKey: normalizeLookupKey(canonicalName),
      isCustom: false
    }
  })

  const custom = Array.from({ length: CUSTOM_TEACHERS_COUNT }, (_, index) => {
    const label = (index + 1).toString().padStart(3, '0')
    const canonicalName = `Custom Teacher ${label}`
    return {
      canonicalName,
      normalizedLookupKey: normalizeLookupKey(canonicalName),
      isCustom: true
    }
  })

  return [...imported, ...custom]
}

function buildTriplesBySchedule(
  triples: ValidSpecializationTriple[],
  schedulesCount: number
): ValidSpecializationTriple[][] {
  const bySchedule = Array.from({ length: schedulesCount }, () => [] as ValidSpecializationTriple[])
  const shuffledTriples = shuffleInPlace([...triples])

  for (let index = 0; index < shuffledTriples.length; index += 1) {
    const triple = shuffledTriples[index]!
    bySchedule[index % schedulesCount]!.push(triple)
  }

  return bySchedule
}

async function seedSchedule(
  config: ScheduleSeedConfig,
  triples: ValidSpecializationTriple[],
  counters: { committeeGlobalIndex: number; studentGlobalIndex: number }
) {
  const createdSchedule = await prisma.timeSchedule.create({
    data: {
      name: buildScheduleName(config),
      type: config.type
    }
  })

  for (let committeeIndex = 0; committeeIndex < triples.length; committeeIndex += 1) {
    const triple = triples[committeeIndex]!
    counters.committeeGlobalIndex += 1
    const committeeGlobalIndex = counters.committeeGlobalIndex
    const committeeLabel = `${committeeGlobalIndex.toString().padStart(3, '0')}-${triple.specializationCode}`
    const studentCount = 5 + (committeeGlobalIndex % 7)
    const firstPauseType = committeeGlobalIndex % 2 === 0 ? PauseType.BREAK : PauseType.LUNCH
    const secondPauseType = firstPauseType === PauseType.BREAK ? PauseType.LUNCH : PauseType.BREAK
    const shouldAddSecondPause = committeeGlobalIndex % 4 === 0 && studentCount >= 8
    const firstPauseInsertBeforeStudentIndex = Math.min(3, studentCount - 1)
    const secondPauseInsertBeforeStudentIndex = shouldAddSecondPause ? Math.min(7, studentCount - 1) : -1

    const itemsCreateData: Prisma.CommitteeItemCreateWithoutCommitteeInput[] = []
    let position = 0

    for (let studentIndex = 0; studentIndex < studentCount; studentIndex += 1) {
      if (studentIndex === firstPauseInsertBeforeStudentIndex) {
        itemsCreateData.push({
          type: CommitteeItemType.PAUSE,
          position,
          pause: {
            create: {
              pauseType: firstPauseType,
              durationMinutes: resolvePauseDurationMinutes(firstPauseType),
              label: resolvePauseLabel(firstPauseType)
            }
          }
        })
        position += 1
      }

      if (studentIndex === secondPauseInsertBeforeStudentIndex) {
        itemsCreateData.push({
          type: CommitteeItemType.PAUSE,
          position,
          pause: {
            create: {
              pauseType: secondPauseType,
              durationMinutes: resolvePauseDurationMinutes(secondPauseType),
              label: resolvePauseLabel(secondPauseType)
            }
          }
        })
        position += 1
      }

      counters.studentGlobalIndex += 1
      itemsCreateData.push({
        type: CommitteeItemType.STUDENT,
        position,
        student: {
          create: buildStudentDraft({
            committeeLabel,
            scheduleIndex: config.index,
            committeeIndex,
            studentIndex,
            globalStudentIndex: counters.studentGlobalIndex,
            triple
          })
        }
      })
      position += 1
    }

    await prisma.committee.create({
      data: {
        timeScheduleId: createdSchedule.id,
        name: committeeLabel,
        startMinute: START_MINUTE_SEQUENCE[committeeGlobalIndex % START_MINUTE_SEQUENCE.length]!,
        date: buildCommitteeDate(committeeGlobalIndex),
        room: ROOM_SEQUENCE[committeeGlobalIndex % ROOM_SEQUENCE.length]!,
        preparationRoom:
          committeeGlobalIndex % 5 === 0
            ? PREPARATION_ROOM_SEQUENCE[committeeGlobalIndex % PREPARATION_ROOM_SEQUENCE.length]!
            : null,
        secretaryName: `Secretary ${committeeLabel}`,
        invigilators: buildInvigilators(committeeGlobalIndex, committeeLabel),
        language: triple.studyLanguage,
        studyProgramName: triple.studyProgramName,
        studyProgramType: triple.studyProgramType,
        specializationCode: triple.specializationCode,
        specializationName: triple.specializationName,
        chairName: `Chair ${committeeLabel}`,
        viceChairName: `Vice Chair ${committeeLabel}`,
        member1Name: `Member A ${committeeLabel}`,
        member2Name: `Member B ${committeeLabel}`,
        member3Name: `Member C ${committeeLabel}`,
        items: {
          create: itemsCreateData
        }
      }
    })
  }
}

async function main() {
  const validTriples = buildValidSpecializationTriples()
  if (validTriples.length < 1) {
    throw new Error('No valid specialization triples resolved from editor constants')
  }

  await prisma.$transaction([prisma.timeSchedule.deleteMany(), prisma.teachersDictionary.deleteMany()])

  await prisma.teachersDictionary.createMany({
    data: buildTeacherDictionaryRows()
  })

  const scheduleConfigs = buildScheduleConfigs()
  const triplesBySchedule = buildTriplesBySchedule(validTriples, scheduleConfigs.length)
  const counters = {
    committeeGlobalIndex: 0,
    studentGlobalIndex: 0
  }

  for (let scheduleIndex = 0; scheduleIndex < scheduleConfigs.length; scheduleIndex += 1) {
    const config = scheduleConfigs[scheduleIndex]!
    await seedSchedule(config, triplesBySchedule[scheduleIndex]!, counters)
  }

  const [scheduleCount, committeeCount, itemCount, studentCount, pauseCount, teacherCount] = await Promise.all([
    prisma.timeSchedule.count(),
    prisma.committee.count(),
    prisma.committeeItem.count(),
    prisma.studentItem.count(),
    prisma.pauseItem.count(),
    prisma.teachersDictionary.count()
  ])

  console.log(
    `Seed completed: schedules=${scheduleCount}, committees=${committeeCount}, items=${itemCount}, students=${studentCount}, pauses=${pauseCount}, teachers=${teacherCount}`
  )
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
