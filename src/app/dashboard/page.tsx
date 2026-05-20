import DashboardClient from '@/components/tracker/DashboardClient'
import { currentMonth, currentYear } from '@/lib/utils'

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string }
}) {
  const now   = { month: currentMonth(), year: currentYear() }
  const month = Math.min(12, Math.max(1, Number(searchParams.month) || now.month))
  const year  = Math.max(2000, Math.min(2100, Number(searchParams.year)  || now.year))

  return <DashboardClient month={month} year={year} />
}
