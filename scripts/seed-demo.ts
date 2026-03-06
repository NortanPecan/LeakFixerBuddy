/**
 * Seed demo data for sandbox development
 * 
 * Creates a demo user with 3-5 days of realistic data:
 * - DailyState (mood, energy)
 * - FitnessDaily (water)
 * - FoodEntry (meals with calories and quality)
 * - Supplement + SupplementIntake
 * - Ritual + RitualCompletion
 * - Optional: Challenge, Task
 * 
 * Usage: bun run seed:demo
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_TELEGRAM_ID = '9000000001'
const DEMO_EMAIL = 'demo@leakfixer.local'

// Helper to get date N days ago (normalized to start of day)
function getDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

// Demo data generators
const DEMO_RITUALS = [
  { title: '💧 Стакан воды утром', category: 'health', days: [1, 2, 3, 4, 5, 6, 7], timeWindow: 'morning' },
  { title: '🏋️ Зарядка 10 мин', category: 'health', days: [1, 2, 3, 4, 5], timeWindow: 'morning' },
  { title: '🚿 Контрастный душ', category: 'health', days: [1, 2, 3, 4, 5], timeWindow: 'morning' },
  { title: '📖 Чтение 20 страниц', category: 'learning', days: [1, 2, 3, 4, 5, 6, 7], timeWindow: 'evening' },
  { title: '🧘 Медитация 10 мин', category: 'mind', days: [1, 2, 3, 4, 5, 6, 7], timeWindow: 'evening' },
  { title: '📝 Планирование дня', category: 'productivity', days: [1, 2, 3, 4, 5], timeWindow: 'morning' },
  { title: '🚶 Прогулка 30 мин', category: 'health', days: [1, 2, 3, 4, 5, 6, 7], timeWindow: 'day' },
  { title: '😴 Сон до 23:00', category: 'health', days: [1, 2, 3, 4, 5, 6, 7], timeWindow: 'evening' },
]

const DEMO_SUPPLEMENTS = [
  { name: 'Витамин D3', dosage: '2000 ME', unit: 'ME', timeWindow: 'morning', days: [1, 2, 3, 4, 5, 6, 7] },
  { name: 'Омега-3', dosage: '1 капсула', unit: 'капс', timeWindow: 'morning', days: [1, 2, 3, 4, 5, 6, 7] },
  { name: 'Магний', dosage: '400 мг', unit: 'мг', timeWindow: 'evening', days: [1, 2, 3, 4, 5, 6, 7] },
]

const MEAL_TEMPLATES = {
  breakfast: [
    { name: 'Овсянка с ягодами', calories: 350, quality: 'good' },
    { name: 'Яичница с тостом', calories: 420, quality: 'neutral' },
    { name: 'Сырники со сметаной', calories: 480, quality: 'neutral' },
    { name: 'Гречка с молоком', calories: 320, quality: 'good' },
    { name: 'Кофе с круассаном', calories: 380, quality: 'bad' },
  ],
  lunch: [
    { name: 'Куриный суп с лапшой', calories: 380, quality: 'good' },
    { name: 'Салат Цезарь с курицей', calories: 450, quality: 'good' },
    { name: 'Паста с курицей', calories: 620, quality: 'neutral' },
    { name: 'Борщ со сметаной', calories: 420, quality: 'good' },
    { name: 'Бургер с картошкой', calories: 850, quality: 'bad' },
  ],
  dinner: [
    { name: 'Рыба с овощами', calories: 380, quality: 'good' },
    { name: 'Куриная грудка с рисом', calories: 450, quality: 'good' },
    { name: 'Творог с фруктами', calories: 280, quality: 'good' },
    { name: 'Пицца Маргарита', calories: 720, quality: 'bad' },
    { name: 'Стейк с картофелем', calories: 680, quality: 'neutral' },
  ],
  snack: [
    { name: 'Яблоко', calories: 80, quality: 'good' },
    { name: 'Греческий йогурт', calories: 150, quality: 'good' },
    { name: 'Орехи микс', calories: 200, quality: 'neutral' },
    { name: 'Шоколадка', calories: 250, quality: 'bad' },
    { name: 'Чипсы', calories: 300, quality: 'bad' },
  ],
}

// Generate realistic daily data
function generateDayData(dayOffset: number) {
  const date = getDaysAgo(dayOffset)
  const dayOfWeek = date.getDay() || 7 // 1-7, Monday = 1
  
  // Mood and energy vary by day
  const baseMood = 6 + Math.random() * 2
  const baseEnergy = 5 + Math.random() * 3
  
  // Weekend has slightly higher mood
  const weekendBonus = (dayOfWeek === 6 || dayOfWeek === 7) ? 1 : 0
  
  // Water intake varies
  const waterTarget = 2500
  const waterBase = 1500 + Math.random() * 1500
  
  return {
    date,
    dayOfWeek,
    mood: Math.round(baseMood + weekendBonus),
    energy: Math.round(baseEnergy),
    water: Math.round(waterBase),
    waterTarget,
  }
}

async function main() {
  console.log('🌱 Seeding demo data...\n')

  // Find or create demo user
  let user = await prisma.appUser.findFirst({
    where: {
      OR: [
        { telegramId: DEMO_TELEGRAM_ID },
        { email: DEMO_EMAIL },
      ],
    },
    include: { profile: true },
  })

  if (user) {
    console.log('👤 Found existing demo user:', user.id)
    
    // Clear existing demo data for clean seed
    console.log('🧹 Clearing existing demo data...')
    
    await prisma.ritualCompletion.deleteMany({ where: { userId: user.id } })
    await prisma.supplementIntake.deleteMany({ where: { userId: user.id } })
    await prisma.foodEntry.deleteMany({ where: { userId: user.id } })
    await prisma.dailyState.deleteMany({ where: { userId: user.id } })
    await prisma.fitnessDaily.deleteMany({ where: { userId: user.id } })
    await prisma.ritual.deleteMany({ where: { userId: user.id } })
    await prisma.supplement.deleteMany({ where: { userId: user.id } })
    await prisma.challenge.deleteMany({ where: { userId: user.id } })
    await prisma.task.deleteMany({ where: { userId: user.id } })
    await prisma.chain.deleteMany({ where: { userId: user.id } })
  } else {
    console.log('👤 Creating new demo user...')
    user = await prisma.appUser.create({
      data: {
        telegramId: DEMO_TELEGRAM_ID,
        telegramUsername: 'demo_user',
        telegramFirstName: 'Demo',
        telegramLastName: 'User',
        telegramLanguageCode: 'ru',
        username: 'demo_user',
        firstName: 'Demo',
        lastName: 'User',
        language: 'ru',
        day: 15,
        streak: 5,
        points: 350,
        authProvider: 'demo',
        email: DEMO_EMAIL,
        lastLoginAt: new Date(),
        profile: {
          create: {
            weight: 75,
            height: 180,
            age: 30,
            sex: 'male',
            targetWeight: 72,
            targetCalories: 2200,
            workProfile: 'mixed',
            waterBaseline: 2500,
          },
        },
      },
      include: { profile: true },
    })
  }

  console.log('✅ Demo user ready:', user.id, '\n')

  // Create rituals
  console.log('📋 Creating rituals...')
  const ritualRecords = []
  for (const ritualData of DEMO_RITUALS) {
    const ritual = await prisma.ritual.create({
      data: {
        userId: user.id,
        title: ritualData.title,
        category: ritualData.category,
        days: JSON.stringify(ritualData.days),
        timeWindow: ritualData.timeWindow,
        status: 'active',
      },
    })
    ritualRecords.push(ritual)
  }
  console.log(`   Created ${ritualRecords.length} rituals\n`)

  // Create supplements
  console.log('💊 Creating supplements...')
  const supplementRecords = []
  for (const suppData of DEMO_SUPPLEMENTS) {
    const supplement = await prisma.supplement.create({
      data: {
        userId: user.id,
        name: suppData.name,
        dosage: suppData.dosage,
        unit: suppData.unit,
        timeWindow: suppData.timeWindow,
        days: JSON.stringify(suppData.days),
        isActive: true,
      },
    })
    supplementRecords.push(supplement)
  }
  console.log(`   Created ${supplementRecords.length} supplements\n`)

  // Generate data for last 5 days (day 0 = today, day 4 = 4 days ago)
  console.log('📅 Generating data for last 5 days...\n')
  
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const dayData = generateDayData(dayOffset)
    const dateStr = dayData.date.toISOString().split('T')[0]
    console.log(`   📆 Day ${dayOffset}: ${dateStr} (${['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dayData.date.getDay()]})`)

    // 1. DailyState (mood, energy)
    await prisma.dailyState.create({
      data: {
        userId: user.id,
        date: dayData.date,
        mood: dayData.mood,
        energy: dayData.energy,
      },
    })

    // 2. FitnessDaily (water)
    await prisma.fitnessDaily.create({
      data: {
        userId: user.id,
        date: dayData.date,
        water: dayData.water,
        waterTarget: dayData.waterTarget,
      },
    })

    // 3. Food entries (2-4 meals per day)
    const mealTypes = ['breakfast', 'lunch', 'dinner'] as const
    const numMeals = Math.random() > 0.3 ? 3 : 2 // Sometimes skip a meal
    const selectedMeals = mealTypes.slice(0, numMeals)
    
    // Maybe add a snack
    if (Math.random() > 0.5) {
      selectedMeals.push('snack')
    }

    for (const mealType of selectedMeals) {
      const templates = MEAL_TEMPLATES[mealType]
      const template = templates[Math.floor(Math.random() * templates.length)]
      
      await prisma.foodEntry.create({
        data: {
          userId: user.id,
          date: dayData.date,
          mealType,
          name: template.name,
          calories: template.calories,
          quality: template.quality,
        },
      })
    }

    // 4. Ritual completions (some completed, some not)
    for (const ritual of ritualRecords) {
      const ritualDays = JSON.parse(ritual.days as string) as number[]
      
      // Only for days when ritual is scheduled
      if (!ritualDays.includes(dayData.dayOfWeek)) continue
      
      // Higher completion rate for earlier days (better habit tracking)
      const completionChance = dayOffset === 0 ? 0.5 : 0.7 + Math.random() * 0.2
      const completed = Math.random() < completionChance
      
      await prisma.ritualCompletion.create({
        data: {
          ritualId: ritual.id,
          userId: user.id,
          date: dayData.date,
          completed,
        },
      })
    }

    // 5. Supplement intakes
    for (const supplement of supplementRecords) {
      const supplementDays = JSON.parse(supplement.days as string) as number[]
      
      if (!supplementDays.includes(dayData.dayOfWeek)) continue
      
      // Higher intake rate for earlier days
      const intakeChance = dayOffset === 0 ? 0.6 : 0.8
      const checked = Math.random() < intakeChance
      
      await prisma.supplementIntake.create({
        data: {
          supplementId: supplement.id,
          userId: user.id,
          date: dayData.date,
          checked,
        },
      })
    }
  }

  // Create a simple challenge
  console.log('\n🏆 Creating demo challenge...')
  const challenge = await prisma.challenge.create({
    data: {
      userId: user.id,
      name: '30 дней без сахара',
      type: 'custom',
      zone: 'health',
      duration: 30,
      progress: 40,
      status: 'active',
    },
  })
  
  // Create challenge progress
  await prisma.challengeProgress.create({
    data: {
      challengeId: challenge.id,
      daysCompleted: 12,
      currentStreak: 5,
    },
  })

  // Create a simple task chain
  console.log('📝 Creating demo tasks...')
  const chain = await prisma.chain.create({
    data: {
      userId: user.id,
      title: 'Настроить окружение',
      status: 'active',
    },
  })

  const tasks = [
    { text: 'Убрать сладкое из дома', status: 'done' },
    { text: 'Купить контейнеры для еды', status: 'done' },
    { text: 'Настроить трекер привычек', status: 'done' },
    { text: 'Составить план тренировок', status: 'todo' },
  ]

  for (let i = 0; i < tasks.length; i++) {
    await prisma.task.create({
      data: {
        chainId: chain.id,
        userId: user.id,
        text: tasks[i].text,
        status: tasks[i].status,
        order: i,
      },
    })
  }

  console.log('\n✅ Demo data seeding complete!')
  console.log('\n📊 Summary:')
  console.log(`   - User: ${user.firstName} ${user.lastName} (@${user.username})`)
  console.log(`   - Days filled: 5 (today + 4 previous days)`)
  console.log(`   - Rituals: ${ritualRecords.length}`)
  console.log(`   - Supplements: ${supplementRecords.length}`)
  console.log(`   - Challenge: ${challenge.name}`)
  console.log(`   - Tasks chain: ${chain.title}`)
  console.log('\n🚀 Run with: bun run seed:demo')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
