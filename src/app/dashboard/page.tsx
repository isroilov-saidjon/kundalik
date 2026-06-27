import AIChatPanel from '@/components/chat/AIChatPanel'

export default function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">AI Chat</h1>
        <p className="text-sm text-gray-500">Rejalarni yozing — AI avtomatik ajratib qo'shadi</p>
      </div>
      <AIChatPanel />
    </div>
  )
}
