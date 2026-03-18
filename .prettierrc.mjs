/** @type {import('prettier').Config} */
export default {
  printWidth: 120,
  tabWidth: 2, // Match the project EditorConfig to avoid editor/CLI disagreements
  useTabs: false,
  semi: false,
  singleQuote: true,
  trailingComma: 'none',
  plugins: ['prettier-plugin-tailwindcss']
}
