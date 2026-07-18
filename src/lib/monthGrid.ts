/** Local-timezone date key, safe for grouping and comparisons. */
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** Local-timezone ISO date (yyyy-MM-dd), matching what date APIs expect. */
export function toISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Calendar cells for a month view: leading days from the previous month
 *  (so weeks start on Monday), the month itself, then trailing days. */
export function buildMonthCells(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1)
  // getDay(): 0 = Sunday; shift so Monday = 0
  const leading = (firstOfMonth.getDay() + 6) % 7
  const start = new Date(year, month, 1 - leading)

  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  // Drop the last row if it's entirely next month
  if (cells[35].getMonth() !== month) {
    return cells.slice(0, 35)
  }
  return cells
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
