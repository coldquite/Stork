export interface HomepageScheduleListItem {
  id: string
  name: string
  updatedAt: string
  committeesCount: number
  studentsCount: number
}

export type ScheduleOpenCandidate = Pick<HomepageScheduleListItem, 'id' | 'name'>
