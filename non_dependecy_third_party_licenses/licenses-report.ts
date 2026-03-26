import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Dependency } from 'rollup-plugin-license'

export const generatedLicensesOutputPath = resolve(process.cwd(), 'public/licenses.txt')

const nonDependencyLicensesDir = resolve(process.cwd(), 'non_dependecy_third_party_licenses')
const LICENSE_NEWLINE = '\n'

export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, LICENSE_NEWLINE)
}

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
      const fileContent = normalizeLineEndings(readFileSync(filePath, 'utf-8')).trim()
      return `# ${entry.name}${LICENSE_NEWLINE}${fileContent}`
    })
    .join(`${LICENSE_NEWLINE}${LICENSE_NEWLINE}`)

  return `${LICENSE_NEWLINE}${LICENSE_NEWLINE}===== NON-DEPENDENCY THIRD-PARTY LICENSES =====${LICENSE_NEWLINE}${LICENSE_NEWLINE}${content}`
}

export function buildLicensesReport(dependencies: Dependency[]): string {
  const dependenciesSection = dependencies
    .map((dependency) => normalizeLineEndings(dependency.text()))
    .join(`${LICENSE_NEWLINE}${LICENSE_NEWLINE}---${LICENSE_NEWLINE}${LICENSE_NEWLINE}`)

  return normalizeLineEndings(`${dependenciesSection}${renderNonDependencyLicenses()}`)
}
