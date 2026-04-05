export type EditorDepartmentCode = '18101' | '18102' | '18103' | '18104' | '18105' | '18106'

interface EditorDepartment {
  code: EditorDepartmentCode
  nameCs: string
  nameEn: string
}

export const EDITOR_DEPARTMENTS_BY_CODE: Record<EditorDepartmentCode, EditorDepartment> = {
  '18101': {
    code: '18101',
    nameCs: 'Katedra teoretické informatiky',
    nameEn: 'Department of Theoretical Computer Science'
  },
  '18102': {
    code: '18102',
    nameCs: 'Katedra softwarového inženýrství',
    nameEn: 'Department of Software Engineering'
  },
  '18103': {
    code: '18103',
    nameCs: 'Katedra číslicového návrhu',
    nameEn: 'Department of Digital Design'
  },
  '18104': {
    code: '18104',
    nameCs: 'Katedra počítačových systémů',
    nameEn: 'Department of Computer Systems'
  },
  '18105': {
    code: '18105',
    nameCs: 'Katedra aplikované matematiky',
    nameEn: 'Department of Applied Mathematics'
  },
  '18106': {
    code: '18106',
    nameCs: 'Katedra informační bezpečnosti',
    nameEn: 'Department of Information Security'
  }
}

export function resolveEditorDepartmentNameByCode(code: string | null | undefined): string | null {
  if (!code) {
    return null
  }

  if (!(code in EDITOR_DEPARTMENTS_BY_CODE)) {
    return null
  }

  return EDITOR_DEPARTMENTS_BY_CODE[code as EditorDepartmentCode].nameCs
}
