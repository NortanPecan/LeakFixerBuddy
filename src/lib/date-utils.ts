export function getStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getEndOfDay(date: Date): Date {
  const d = getStartOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
}

