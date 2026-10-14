/**
 * CSV Generation and Export utilities
 */

/**
 * Escapes a cell for CSV formatting
 * @param {any} value 
 * @returns {string}
 */
function escapeCsvValue(value) {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

/**
 * Converts array of objects into CSV string
 * @param {Array<Object>} rows 
 * @param {Array<{ key: string, label: string }>} columns 
 * @returns {string}
 */
export function convertToCsv(rows, columns) {
  if (!rows || rows.length === 0) return ''
  
  const headers = columns.map(c => escapeCsvValue(c.label)).join(',')
  const dataRows = rows.map(row => {
    return columns.map(c => escapeCsvValue(row[c.key])).join(',')
  }).join('\r\n')

  return `${headers}\r\n${dataRows}`
}

/**
 * Triggers browser download of a CSV file
 * @param {string} filename 
 * @param {string} csvContent 
 */
export function downloadCsv(filename, csvContent) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
