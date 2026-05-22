import DashboardClient from '@/components/tracker/DashboardClient'
import { currentMonth, currentYear } from '@/lib/utils'

type Tab = 'habits' | 'calories' | 'gym'
const VALID_TABS: Tab[] = ['habits', 'calories', 'gym']

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; tab?: string }
}) {
  const now   = { month: currentMonth(), year: currentYear() }
  const month = Math.min(12, Math.max(1, Number(searchParams.month) || now.month))
  const year  = Math.max(2000, Math.min(2100, Number(searchParams.year) || now.year))
  const tab   = VALID_TABS.includes(searchParams.tab as Tab)
    ? (searchParams.tab as Tab)
    : 'habits'

  return <DashboardClient month={month} year={year} tab={tab} />
}
