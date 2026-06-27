import Link from 'next/link'
import { BookOpen, Brain, Calendar, Users, MapPin, Bell } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Kundalik</span>
          </div>
          <Link
            href="/login"
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Kirish
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Aqlli{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Shaxsiy Kundalik
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Matn yozing — AI vazifalarni ajratib, kalendarga qo'shib beradi.
            Guruh, shaxsiy va safar rejalarini bir joyda boshqaring.
          </p>
          <Link
            href="/login"
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Bepul boshlash
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.bg}`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

const features = [
  {
    icon: Brain,
    title: 'AI Tahlil',
    desc: 'Matn yozing, Claude AI vazifalarni shaxsiy, guruh va geo turlarga ajratadi.',
    bg: 'bg-indigo-50',
    color: 'text-indigo-600',
  },
  {
    icon: Calendar,
    title: 'Haftalik Kalendar',
    desc: 'Google Calendar uslubida voqealarni ko\'ring, qo\'shing va boshqaring.',
    bg: 'bg-blue-50',
    color: 'text-blue-600',
  },
  {
    icon: Users,
    title: 'Guruh Panel',
    desc: 'A\'zolar bilan birgalikda rejalashing, band vaqtlarni ko\'ring.',
    bg: 'bg-green-50',
    color: 'text-green-600',
  },
  {
    icon: Bell,
    title: 'Uchrashuv So\'rovi',
    desc: 'A\'zoning band soatlarini ko\'ring va munosib vaqtga uchrashuv so\'rang.',
    bg: 'bg-yellow-50',
    color: 'text-yellow-600',
  },
  {
    icon: MapPin,
    title: 'Geo Eslatmalar',
    desc: 'Safar rejalarini kiriting, 1 kun oldin avtomatik eslatma oling.',
    bg: 'bg-red-50',
    color: 'text-red-600',
  },
  {
    icon: BookOpen,
    title: 'Shaxsiy Kundalik',
    desc: 'Barcha rejalar va voqealar bir joyda — xavfsiz va qulay.',
    bg: 'bg-purple-50',
    color: 'text-purple-600',
  },
]
