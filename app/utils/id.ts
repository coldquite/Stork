import { v4 as uuidv4 } from 'uuid'

export function createLocalId(): string {
  return uuidv4()
}
