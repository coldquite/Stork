import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  PrismaClient,
  CommitteeItemType,
  RepeatType,
  ThesisLanguage,
  TimeScheduleType
} from './generated/client/client'

const connectionString = process.env.DATABASE_URL

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const repeatTypes = [
  RepeatType.NONE,
  RepeatType.THESIS_DEFENSE,
  RepeatType.ORAL_EXAM,
  RepeatType.BOTH,
  RepeatType.UNKNOWN
] as const

const thesisLanguages = [ThesisLanguage.CZECH, ThesisLanguage.ENGLISH, ThesisLanguage.SLOVAK] as const

interface StudentMatrixRow {
  repeatType: RepeatType
  thesisLanguage: ThesisLanguage
}

interface ScheduleSeedConfig {
  name: string
  type: TimeScheduleType
  dayOffset: number
}

interface CommitteeSeedConfig {
  sortOrder: number
  startMinute: number
  room: string | null
}

const studentMatrix: StudentMatrixRow[] = repeatTypes.flatMap((repeatType) =>
  thesisLanguages.map((thesisLanguage) => ({ repeatType, thesisLanguage }))
)

const SCHEDULE_REPEAT_COUNT = 3
const scheduleTypes = [TimeScheduleType.MANUAL, TimeScheduleType.AUTO] as const

function buildScheduleSeedConfigs(repeatCount: number): ScheduleSeedConfig[] {
  return scheduleTypes.flatMap((scheduleType, typeIndex) =>
    Array.from({ length: repeatCount }, (_, versionIndex) => {
      const index = typeIndex * repeatCount + versionIndex

      return {
        name: `Dumb schedule name ${index + 1}`,
        type: scheduleType,
        dayOffset: index
      }
    })
  )
}

const scheduleSeedConfigs: ScheduleSeedConfig[] = buildScheduleSeedConfigs(SCHEDULE_REPEAT_COUNT)

const committeeSeedConfigs: CommitteeSeedConfig[] = [
  { sortOrder: 1, startMinute: 525, room: 'Dumb room name 1' },
  { sortOrder: 2, startMinute: 780, room: 'Dumb room name 2' }
]

function buildStudentDraft(
  row: StudentMatrixRow,
  scheduleIndex: number,
  committeeSortOrder: number,
  matrixIndex: number
) {
  const studentOrder = matrixIndex + 1
  const idPart = `${scheduleIndex + 1}-${committeeSortOrder}-${studentOrder}`.padStart(8, '0')
  const languageLabel =
    row.thesisLanguage === ThesisLanguage.CZECH
      ? 'Czech'
      : row.thesisLanguage === ThesisLanguage.ENGLISH
        ? 'English'
        : 'Slovak'

  return {
    firstName: `Dumb student first name ${studentOrder}`,
    lastName: `Dumb student last name ${committeeSortOrder}`,
    email: `dumb_email.${idPart}@example.test`,
    mobilePhone: studentOrder % 3 === 0 ? null : `+42077710${idPart}`,
    personalNumber: studentOrder % 4 === 0 ? null : `DUMB-${idPart}`,
    titlesBefore: matrixIndex % 2 === 0 ? 'Bc.' : null,
    titlesAfter: matrixIndex % 5 === 0 ? 'DiS.' : null,
    specialization: `Dumb specialization name ${committeeSortOrder}`,
    thesisTitleLocal: `Dumb thesis local title ${languageLabel} ${idPart}`,
    thesisTitleEn: `Dumb thesis english title ${idPart}`,
    thesisLanguage: row.thesisLanguage,
    supervisorName: `Dumb supervisor name ${committeeSortOrder}-${studentOrder}`,
    reviewerName: `Dumb reviewer name ${committeeSortOrder}-${studentOrder}`,
    repeatType: row.repeatType,
    elsa: studentOrder % 2 === 1,
    prepareMinutes: 45 + (matrixIndex % 2) * 5,
    examMinutes: 30 + (matrixIndex % 3) * 5
  }
}

async function createCommitteeWithItems(
  scheduleId: string,
  dayOffset: number,
  committee: CommitteeSeedConfig,
  rows: StudentMatrixRow[]
) {
  const createdCommittee = await prisma.committee.create({
    data: {
      timeScheduleId: scheduleId,
      code: `Dumb comitee name ${committee.sortOrder}`,
      sortOrder: committee.sortOrder,
      startMinute: committee.startMinute,
      date: new Date(Date.UTC(2026, 5, 10 + dayOffset, 0, 0, 0)),
      room: committee.room,
      secretaryName: `Dumb secretary name ${committee.sortOrder}`,
      invigilators: [`Dumb invigilator name ${committee.sortOrder}-1`, `Dumb invigilator name ${committee.sortOrder}-2`]
    }
  })

  let position = 0

  await prisma.committeeItem.create({
    data: {
      committeeId: createdCommittee.id,
      type: CommitteeItemType.PAUSE,
      position: position++,
      pause: {
        create: {
          label: 'Dumb pause name 1',
          durationMinutes: 15
        }
      }
    }
  })

  for (const [index, row] of rows.entries()) {
    await prisma.committeeItem.create({
      data: {
        committeeId: createdCommittee.id,
        type: CommitteeItemType.STUDENT,
        position: position++,
        student: {
          create: buildStudentDraft(row, dayOffset, committee.sortOrder, index)
        }
      }
    })
  }

  await prisma.committeeItem.create({
    data: {
      committeeId: createdCommittee.id,
      type: CommitteeItemType.PAUSE,
      position: position,
      pause: {
        create: {
          label: 'Dumb pause name 2',
          durationMinutes: 20
        }
      }
    }
  })
}

async function seedTimeSchedule(config: ScheduleSeedConfig) {
  const timeSchedule = await prisma.timeSchedule.create({
    data: {
      type: config.type,
      name: config.name
    }
  })

  const firstCommitteeRows = studentMatrix.filter((_, idx) => idx % 2 === 0)
  const secondCommitteeRows = studentMatrix.filter((_, idx) => idx % 2 === 1)

  await createCommitteeWithItems(timeSchedule.id, config.dayOffset, committeeSeedConfigs[0]!, firstCommitteeRows)
  await createCommitteeWithItems(timeSchedule.id, config.dayOffset, committeeSeedConfigs[1]!, secondCommitteeRows)
}

async function main() {
  await prisma.timeSchedule.deleteMany()

  for (const config of scheduleSeedConfigs) {
    await seedTimeSchedule(config)
  }

  const scheduleCount = await prisma.timeSchedule.count()
  const committeeCount = await prisma.committee.count()
  const itemCount = await prisma.committeeItem.count()
  const studentCount = await prisma.studentItem.count()
  const pauseCount = await prisma.pauseItem.count()

  console.log(
    `Seed completed: schedules=${scheduleCount}, committees=${committeeCount}, items=${itemCount}, students=${studentCount}, pauses=${pauseCount}`
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
