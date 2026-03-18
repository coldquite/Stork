import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { EOL } from 'node:os'
import { resolve } from 'node:path'
import type { Dependency } from 'rollup-plugin-license'

export const generatedLicensesOutputPath = resolve(process.cwd(), 'public/licenses.txt')

const nonDependencyLicensesDir = resolve(process.cwd(), 'non_dependecy_third_party_licenses')

function renderNonDependencyLicenses(): string {
  if (!existsSync(nonDependencyLicensesDir)) {
    return ''
  }

  const files = readdirSync(nonDependencyLicensesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.txt'))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (!files.length) {
    return ''
  }

  const content = files
    .map((entry) => {
      const filePath = resolve(nonDependencyLicensesDir, entry.name)
      return `# ${entry.name}${EOL}${readFileSync(filePath, 'utf-8').trim()}`
    })
    .join(`${EOL}${EOL}`)

  return `${EOL}${EOL}===== NON-DEPENDENCY THIRD-PARTY LICENSES =====${EOL}${EOL}${content}`
}

export function buildLicensesReport(dependencies: Dependency[]): string {
  const dependenciesSection = dependencies.map((dependency) => dependency.text()).join(`${EOL}${EOL}---${EOL}${EOL}`)
  return `${dependenciesSection}${renderNonDependencyLicenses()}`
}
