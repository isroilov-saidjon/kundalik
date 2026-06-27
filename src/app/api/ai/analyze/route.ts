import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history, localDate, localTime, pendingRequests } = await request.json()
  const today = localDate || new Date().toISOString().split('T')[0]
  const currentTime = localTime || new Date().toTimeString().slice(0, 5)

  const pendingContext = pendingRequests?.length > 0
    ? `\n\nKutilayotgan uchrashuv so'rovlari (foydalanuvchiga yuborilgan, javob berilmagan):\n${pendingRequests.map((r: { title: string; proposed_time: string; duration_minutes: number; from_profile?: { full_name?: string; email?: string } }) =>
        `- "${r.title}" — ${r.from_profile?.full_name || r.from_profile?.email} tomonidan, ${new Date(r.proposed_time).toLocaleString('uz')}, ${r.duration_minutes} daqiqa`
      ).join('\n')}\nAgar foydalanuvchi bu haqda so'rasa, eslatib qo'y.`
    : ''

  const systemPrompt = `Siz "Kundalik" degan shaxsiy kundalik ilovasi yordamchisisiz. Foydalanuvchi bilan o'zbek tilida do'stona suhbat qurasiz.

Bugungi sana: ${today}
Hozirgi vaqt: ${currentTime}

Qoidalar:
1. Foydalanuvchi bilan oddiy suhbat qiling — savollarga javob bering, maslahat bering, gaplashing.
2. Agar foydalanuvchi matnida aniq vazifa, uchrashuv, safar yoki eslatma bo'lsa — yarating (action: "create").
3. Agar foydalanuvchi biror narsani o'chirmoqchi bo'lsa — action: "delete" (bitta), yoki "delete_range" (oraliq).
4. "bugun", "ertaga", "shu hafta" kabi iboralar uchun aniq sanalarni hisoblang (bugungi sana: ${today}).
5. Vaqt talqini:
   - "hozirdan X gacha" yoki "X gacha band qil" → time: ${currentTime}, end_time: X
   - "kech 6 gacha" yoki "18:00 gacha" → time: ${currentTime} (hozirgi vaqt), end_time: "18:00"
   - "ertalab", "tushda", "kechqurun" kabi aniq so'zlar bo'lsa → AM/PM aniq, so'rama
   - MUHIM: Agar foydalanuvchi BUGUN uchun soat aytsa va hozirgi vaqt (${currentTime}) o'sha soatdan o'tgan bo'lsa → kechki deb hisobla (masalan hozir 15:00, "soat 8" → 20:00). Lekin ERTAGA yoki BOSHQA KUN uchun soat aytilsa → ertalabmi yoki kechkunmi aniq EMAS, SO'RA.
6. QOIDA: Vazifa yozishdan OLDIN quyidagilarni tekshir:
   A) Soat aytilganmi? Yo'q → "Qaysi soatda bo'ladi?" deb so'ra
   B) Bugun emas, boshqa kun uchun soat aytilgan, lekin ertalab/kechqurun noaniq → "Ertalabmi yoki kechkunmi?" deb so'ra
   C) Qancha davom etishi aytilganmi? (masalan "2 soat", "45 daqiqa", "soat 5 gacha") → Yo'q bo'lsa → "Qancha vaqt davom etadi?" deb so'ra

   MUHIM: A, B yoki C dan biri ham noaniq bo'lsa — tasks BO'SH qoldir, hech narsa saqlaMA. Faqat reply da savolni ber.
   Foydalanuvchi javob bergach, BARCHA ma'lumot to'liq bo'lganda action: "create" bilan saqlash mumkin.

   ISTISNO: "X gacha band qil" → end_time aniq, davomiylik so'raMa. "Hozirdan boshla" → time aniq.
7. Agar vazifa yo'q bo'lsa — tasks massivini bo'sh qoldiring.

Hafta boshi = dushanba. Shu hafta = ${today} dan ${new Date(new Date(today).getTime() + (6 - new Date(today).getDay() + 1) % 7 * 86400000).toISOString().split('T')[0]} gacha.

Har doim quyidagi JSON formatida javob bering:
{
  "reply": "Foydalanuvchiga do'stona javob (o'zbek tilida)",
  "tasks": [
    {
      "action": "create|delete|delete_range|clarify",
      "type": "personal|group|geo",
      "title": "Vazifa nomi (delete uchun)",
      "description": "Qo'shimcha ma'lumot",
      "date": "YYYY-MM-DD",
      "date_from": "YYYY-MM-DD (delete_range boshlanish)",
      "date_to": "YYYY-MM-DD (delete_range tugash)",
      "time": "HH:MM",
      "end_time": "HH:MM",
      "location": "Joy"
    }
  ]
}

Faqat JSON qaytaring, boshqa matn yo'q.${pendingContext}`

  const conversationHistory = (history || []).slice(-6).map((m: { role: string; content: string }) => ({
    role: m.role === 'user' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }))

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)

    // Vaqt o'tib ketgan bo'lsa kechki vaqtga o'tkazish
    const adjustedTasks = (parsed.tasks || []).map((task: Record<string, unknown>) => {
      if (task.action !== 'create' || !task.time || task.date !== today) return task
      const [h, m] = (task.time as string).split(':').map(Number)
      const taskMinutes = h * 60 + m
      const [ch, cm] = currentTime.split(':').map(Number)
      const currentMinutes = ch * 60 + cm
      // Agar vaqt o'tib ketgan bo'lsa va 12 dan kichik bo'lsa → +12 soat (kechki)
      if (taskMinutes < currentMinutes && h < 12) {
        const newHour = h + 12
        task = { ...task, time: `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
        if (task.end_time) {
          const [eh, em] = (task.end_time as string).split(':').map(Number)
          task = { ...task, end_time: `${String(eh + 12).padStart(2, '0')}:${String(em).padStart(2, '0')}` }
        }
      }
      return task
    })

    return NextResponse.json({
      reply: parsed.reply || 'Tushundim!',
      tasks: adjustedTasks,
    })
  } catch (error) {
    console.error('AI analyze error:', error)
    return NextResponse.json(
      { reply: 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.', tasks: [] },
      { status: 500 }
    )
  }
}
