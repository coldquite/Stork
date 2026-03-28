export interface HomepagePlanListItem {
  id: string
  name: string
  updatedAt: string
  committeesCount: number
  studentsCount: number
}

export type PlanOpenCandidate = Pick<HomepagePlanListItem, 'id' | 'name'>
