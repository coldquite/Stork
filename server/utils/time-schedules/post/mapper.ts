import type { Prisma } from '~~/prisma/generated/client/client'
import type { PostCommitteeDto, PostCommitteeItemDto, PostTimeScheduleRequestDto } from '#shared/types/time-schedules'

function mapItemCreateData(item: PostCommitteeItemDto): Prisma.CommitteeItemCreateWithoutCommitteeInput {
  if (item.type === 'STUDENT') {
    return {
      type: 'STUDENT',
      position: item.position,
      student: {
        create: {
          firstName: item.student.firstName,
          lastName: item.student.lastName,
          email: item.student.email,
          titlesBefore: item.student.titlesBefore,
          titlesAfter: item.student.titlesAfter,
          thesisTitleLocal: item.student.thesisTitleLocal,
          thesisTitleEn: item.student.thesisTitleEn,
          thesisLanguage: item.student.thesisLanguage,
          supervisorName: item.student.supervisorName,
          reviewerName: item.student.reviewerName,
          additionalSupervisorName: item.student.additionalSupervisorName,
          additionalReviewerName: item.student.additionalReviewerName,
          studyProgramName: item.student.studyProgramName,
          studyProgramType: item.student.studyProgramType,
          specializationName: item.student.specializationName,
          specializationCode: item.student.specializationCode,
          studyLanguage: item.student.studyLanguage,
          repeatType: item.student.repeatType,
          prepareMinutes: item.student.prepareMinutes,
          examMinutes: item.student.examMinutes
        }
      }
    }
  }

  return {
    type: 'PAUSE',
    position: item.position,
    pause: {
      create: {
        label: item.pause.label,
        durationMinutes: item.pause.durationMinutes
      }
    }
  }
}

function mapCommitteeCreateData(committee: PostCommitteeDto): Prisma.CommitteeCreateWithoutTimeScheduleInput {
  return {
    name: committee.name,
    startMinute: committee.startMinute,
    date: new Date(committee.date),
    room: committee.room,
    secretaryName: committee.secretaryName,
    invigilators: committee.invigilators,
    language: committee.language,
    studyProgramName: committee.studyProgramName,
    studyProgramType: committee.studyProgramType,
    specializationName: committee.specializationName,
    specializationCode: committee.specializationCode,
    defenseDepartmentCode: committee.defenseDepartmentCode,
    defenseDepartmentName: committee.defenseDepartmentName,
    chairName: committee.chairName,
    viceChairName: committee.viceChairName,
    member1Name: committee.member1Name,
    member2Name: committee.member2Name,
    member3Name: committee.member3Name,
    items: {
      create: committee.items.map((item) => mapItemCreateData(item))
    }
  }
}

export function mapTimeScheduleCreateData(payload: PostTimeScheduleRequestDto): Prisma.TimeScheduleCreateInput {
  return {
    name: payload.name,
    type: payload.type,
    committees: {
      create: payload.committees.map((committee) => mapCommitteeCreateData(committee))
    }
  }
}
