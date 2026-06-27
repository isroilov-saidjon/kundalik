import WeeklyCalendar from '@/components/calendar/WeeklyCalendar'

export default function CalendarPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Kalendar</h1>
        <p className="text-sm text-gray-500">Haftalik ko'rinish</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <WeeklyCalendar />
      </div>
    </div>
  )
}
