import { resolveEditorSpecializationOptionByCode, resolveEditorStudyProgramNameOptions } from '#shared/constants/editor'
import type { ScheduleDraftCommittee } from '~/types/schedule-draft'
import { normalizeOptionalText, normalizeRequiredText } from '~/utils/editor/draft-committee'

/**
 * Mutations for committee metadata fields (room, members, study program chain) on the selected committee.
 */
export function useEditorCommitteeFields(selectedCommittee: ComputedRef<ScheduleDraftCommittee | null>) {
  const MIN_START_MINUTE = 0
  const MAX_START_MINUTE = 24 * 60 - 1

  function clearCommitteeSpecializationAndDepartment(committee: ScheduleDraftCommittee): void {
    committee.specializationCode = ''
    committee.specializationName = ''
    committee.defenseDepartmentCode = ''
    committee.defenseDepartmentName = ''
  }

  function withSelectedCommittee(action: (committee: ScheduleDraftCommittee) => void): void {
    const committee = selectedCommittee.value
    if (!committee) {
      return
    }

    action(committee)
  }

  function updateSelectedCommitteeRoom(nextRoom: string): void {
    withSelectedCommittee((committee) => {
      committee.room = normalizeOptionalText(nextRoom)
    })
  }

  function updateSelectedCommitteeDate(nextIsoDate: string): void {
    withSelectedCommittee((committee) => {
      committee.date = nextIsoDate
    })
  }

  function updateSelectedCommitteeStartMinute(nextStartMinute: number): void {
    withSelectedCommittee((committee) => {
      if (!Number.isInteger(nextStartMinute)) {
        return
      }

      if (nextStartMinute < MIN_START_MINUTE || nextStartMinute > MAX_START_MINUTE) {
        return
      }

      committee.startMinute = nextStartMinute
    })
  }

  function updateSelectedCommitteeSecretary(nextSecretaryName: string): void {
    withSelectedCommittee((committee) => {
      committee.secretaryName = normalizeOptionalText(nextSecretaryName)
    })
  }

  function updateSelectedCommitteeChairName(nextChairName: string): void {
    withSelectedCommittee((committee) => {
      committee.chairName = normalizeRequiredText(nextChairName)
    })
  }

  function updateSelectedCommitteeViceChairName(nextViceChairName: string): void {
    withSelectedCommittee((committee) => {
      committee.viceChairName = normalizeRequiredText(nextViceChairName)
    })
  }

  function updateSelectedCommitteeMember1Name(nextMember1Name: string): void {
    withSelectedCommittee((committee) => {
      committee.member1Name = normalizeRequiredText(nextMember1Name)
    })
  }

  function updateSelectedCommitteeMember2Name(nextMember2Name: string): void {
    withSelectedCommittee((committee) => {
      committee.member2Name = normalizeRequiredText(nextMember2Name)
    })
  }

  function updateSelectedCommitteeMember3Name(nextMember3Name: string): void {
    withSelectedCommittee((committee) => {
      committee.member3Name = normalizeRequiredText(nextMember3Name)
    })
  }

  function updateSelectedCommitteeLanguage(nextLanguage: ScheduleDraftCommittee['language']): void {
    withSelectedCommittee((committee) => {
      committee.language = nextLanguage

      const allowedStudyProgramNames = resolveEditorStudyProgramNameOptions(
        committee.studyProgramType,
        committee.language
      )
      if (allowedStudyProgramNames.includes(committee.studyProgramName)) {
        return
      }

      committee.studyProgramName = ''
      clearCommitteeSpecializationAndDepartment(committee)
    })
  }

  function updateSelectedCommitteeStudyProgramType(
    nextStudyProgramType: ScheduleDraftCommittee['studyProgramType']
  ): void {
    withSelectedCommittee((committee) => {
      const hasStudyProgramTypeChanged = committee.studyProgramType !== nextStudyProgramType
      committee.studyProgramType = nextStudyProgramType

      if (!hasStudyProgramTypeChanged) {
        return
      }

      clearCommitteeSpecializationAndDepartment(committee)

      const allowedStudyProgramNames = resolveEditorStudyProgramNameOptions(
        committee.studyProgramType,
        committee.language
      )
      if (allowedStudyProgramNames.includes(committee.studyProgramName)) {
        return
      }

      committee.studyProgramName = ''
    })
  }

  function updateSelectedCommitteeStudyProgramName(nextStudyProgramName: string): void {
    withSelectedCommittee((committee) => {
      const normalizedStudyProgramName = normalizeRequiredText(nextStudyProgramName)
      const allowedStudyProgramNames = resolveEditorStudyProgramNameOptions(
        committee.studyProgramType,
        committee.language
      )
      const isValidStudyProgramName =
        normalizedStudyProgramName.length < 1 || allowedStudyProgramNames.includes(normalizedStudyProgramName)
      if (!isValidStudyProgramName) {
        return
      }

      if (committee.studyProgramName !== normalizedStudyProgramName) {
        clearCommitteeSpecializationAndDepartment(committee)
      }

      committee.studyProgramName = normalizedStudyProgramName
    })
  }

  function updateSelectedCommitteeSpecializationCode(nextSpecializationCode: string): void {
    withSelectedCommittee((committee) => {
      const normalizedSpecializationCode = normalizeRequiredText(nextSpecializationCode)
      committee.specializationCode = normalizedSpecializationCode
      if (normalizedSpecializationCode.length < 1) {
        committee.specializationName = ''
        committee.defenseDepartmentCode = ''
        committee.defenseDepartmentName = ''
        return
      }

      const specializationOption = resolveEditorSpecializationOptionByCode(
        committee.studyProgramType,
        committee.studyProgramName,
        normalizedSpecializationCode
      )
      committee.specializationName = specializationOption?.specializationName ?? normalizedSpecializationCode
      committee.defenseDepartmentCode = specializationOption?.departmentCode ?? ''
      committee.defenseDepartmentName = specializationOption?.departmentNameCs ?? ''
    })
  }

  return {
    updateSelectedCommitteeRoom,
    updateSelectedCommitteeDate,
    updateSelectedCommitteeStartMinute,
    updateSelectedCommitteeSecretary,
    updateSelectedCommitteeChairName,
    updateSelectedCommitteeViceChairName,
    updateSelectedCommitteeMember1Name,
    updateSelectedCommitteeMember2Name,
    updateSelectedCommitteeMember3Name,
    updateSelectedCommitteeLanguage,
    updateSelectedCommitteeStudyProgramType,
    updateSelectedCommitteeStudyProgramName,
    updateSelectedCommitteeSpecializationCode
  }
}
