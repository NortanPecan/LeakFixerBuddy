import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

// GET - Export data as markdown
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const entities = searchParams.get("entities")?.split(",") || [
      "checkins",
      "rituals",
      "tasks",
      "challenges",
      "skills",
      "traits",
      "notes",
    ];

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    await requireSelf(request, userId);

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Ensure dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const dateRange = `${formatDate(start)} — ${formatDate(end)}`;

    let markdown = `# Сводка за период ${dateRange}\n\n`;

    // Fetch and format each entity type
    if (entities.includes("checkins")) {
      const checkins = await db.dailyCheckin
        .findMany({
          where: {
            userId,
            date: { gte: start, lte: end },
          },
          orderBy: { date: "asc" },
        })
        .catch(() => []);

      if (checkins.length > 0) {
        const morningCheckins = checkins.filter((c) => c.type === "morning");
        const eveningCheckins = checkins.filter((c) => c.type === "evening");
        const morningWithEnergy = morningCheckins.filter((c) => c.energy);
        const eveningWithRating = eveningCheckins.filter((c) => c.dayRating);
        const avgEnergy =
          morningWithEnergy.reduce((s, c) => s + (c.energy || 0), 0) /
          (morningWithEnergy.length || 1);
        const avgRating =
          eveningWithRating.reduce((s, c) => s + (c.dayRating || 0), 0) /
          (eveningWithRating.length || 1);

        markdown += `## Чекапы\n`;
        markdown += `- Утренних чекапов: ${morningCheckins.length}\n`;
        markdown += `- Вечерних чекапов: ${eveningCheckins.length}\n`;
        if (morningWithEnergy.length > 0) {
          markdown += `- Средняя утренняя энергия: ${avgEnergy.toFixed(1)}/10\n`;
        }
        if (eveningWithRating.length > 0) {
          markdown += `- Средняя оценка дня: ${avgRating.toFixed(1)}/10\n`;
        }

        const wins = eveningCheckins.filter((c) => c.win).map((c) => c.win);
        if (wins.length > 0) {
          markdown += `- Победы дня:\n`;
          wins.slice(0, 10).forEach((w) => {
            markdown += `  - ${w}\n`;
          });
        }

        const intentions = morningCheckins.filter((c) => c.intention).map((c) => c.intention);
        if (intentions.length > 0) {
          markdown += `- Намерения утра:\n`;
          intentions.slice(0, 10).forEach((i) => {
            markdown += `  - ${i}\n`;
          });
        }
        markdown += `\n`;
      }
    }

    if (entities.includes("rituals")) {
      const rituals = await db.ritual.findMany({
        where: { userId, status: "active" },
        orderBy: { createdAt: "desc" },
      });

      const completions = await db.ritualCompletion.findMany({
        where: {
          userId,
          date: { gte: start, lte: end },
        },
      });

      const completedCount = completions.filter((c) => c.completed).length;
      const totalPossible =
        rituals.length * Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const completionRate =
        totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;

      // Find most stable and most missed rituals
      const ritualStats = new Map<string, { completed: number; total: number }>();
      rituals.forEach((r) => ritualStats.set(r.id, { completed: 0, total: 0 }));
      completions.forEach((c) => {
        const stat = ritualStats.get(c.ritualId);
        if (stat) {
          stat.total++;
          if (c.completed) stat.completed++;
        }
      });

      const ritualCompletionRates = Array.from(ritualStats.entries()).map(([id, stats]) => {
        const ritual = rituals.find((r) => r.id === id);
        return {
          name: ritual?.title || "Unknown",
          rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        };
      });

      const topStable = ritualCompletionRates
        .filter((r) => r.rate > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 3);
      const mostMissed = ritualCompletionRates
        .filter((r) => r.rate < 100)
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 3);

      markdown += `## Ритуалы\n`;
      markdown += `- Выполнено ${completionRate}% от всех запланированных\n`;
      if (topStable.length > 0) {
        markdown += `- Топ ритуалов по стабильности: ${topStable.map((r) => `${r.name} (${r.rate}%)`).join(", ")}\n`;
      }
      if (mostMissed.length > 0) {
        markdown += `- Ритуалы, которые чаще всего пропускались: ${mostMissed.map((r) => `${r.name} (${r.rate}%)`).join(", ")}\n`;
      }
      markdown += `- Активных ритуалов: ${rituals.length}\n\n`;
    }

    if (entities.includes("tasks")) {
      const tasks = await db.task.findMany({
        where: {
          userId,
          createdAt: { gte: start, lte: end },
        },
      });

      const completed = tasks.filter((t) => t.status === "done").length;
      const pending = tasks.filter((t) => t.status === "todo").length;
      const overdue = tasks.filter(
        (t) => t.status === "todo" && t.date && new Date(t.date) < new Date()
      ).length;

      markdown += `## Задачи\n`;
      markdown += `- Всего задач за период: ${tasks.length}\n`;
      markdown += `- Выполнено: ${completed}\n`;
      markdown += `- В ожидании: ${pending}\n`;
      markdown += `- Просрочено: ${overdue}\n\n`;
    }

    if (entities.includes("challenges")) {
      const challenges = await db.challenge.findMany({
        where: { userId, status: "active" },
        include: { progressDetails: true },
      });

      markdown += `## Челенджи\n`;
      if (challenges.length === 0) {
        markdown += `- Нет активных челенджей\n\n`;
      } else {
        challenges.forEach((c) => {
          const progress = c.progressDetails[0];
          markdown += `- **${c.name}**: ${c.progress}% (дней выполнено: ${progress?.daysCompleted || 0}/${c.duration})\n`;
        });
        markdown += `\n`;
      }
    }

    if (entities.includes("skills")) {
      const skills = await db.skill.findMany({
        where: { userId, isArchived: false },
        orderBy: [{ importance: "desc" }, { level: "desc" }],
      });

      const recentHistory = await db.skillHistory.findMany({
        where: {
          skill: { userId },
          createdAt: { gte: start, lte: end },
        },
        include: { skill: true },
      });

      const skillProgress = new Map<string, number>();
      recentHistory.forEach((h) => {
        const current = skillProgress.get(h.skillId) || 0;
        skillProgress.set(h.skillId, current + (h.newLevel - h.oldLevel));
      });

      markdown += `## Навыки\n`;
      if (skills.length === 0) {
        markdown += `- Навыков пока нет\n\n`;
      } else {
        const withProgress = Array.from(skillProgress.entries())
          .map(([id, progress]) => {
            const skill = skills.find((s) => s.id === id);
            return { name: skill?.name || "Unknown", progress };
          })
          .filter((s) => s.progress > 0);

        if (withProgress.length > 0) {
          markdown += `- Навыки с прогрессом за период: ${withProgress.map((s) => `${s.name} (+${s.progress} ур.)`).join(", ")}\n`;
        }
        markdown += `- Всего навыков: ${skills.length}\n`;
        markdown += `- Важные (важность 3): ${
          skills
            .filter((s) => s.importance === 3)
            .map((s) => s.name)
            .join(", ") || "нет"
        }\n\n`;
      }
    }

    if (entities.includes("traits")) {
      const traits = await db.trait.findMany({
        where: { userId, isArchived: false },
      });

      const traitsWithGap = traits
        .filter((t) => t.type === "positive" && t.targetScore !== null)
        .map((t) => ({
          name: t.name,
          current: t.score,
          target: t.targetScore!,
          gap: t.targetScore! - t.score,
        }))
        .filter((t) => t.gap > 0)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 3);

      markdown += `## Качества\n`;
      if (traitsWithGap.length > 0) {
        markdown += `- ТОП-3 качества с наибольшим разрывом:\n`;
        traitsWithGap.forEach((t) => {
          markdown += `  - ${t.name}: ${t.current}/${t.target} (разрыв: ${t.gap})\n`;
        });
      }
      markdown += `- Всего качеств: ${traits.length}\n\n`;
    }

    if (entities.includes("notes")) {
      const notes = await db.note.findMany({
        where: {
          userId,
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      markdown += `## Заметки/Мысли\n`;
      if (notes.length === 0) {
        markdown += `- Нет заметок за период\n\n`;
      } else {
        markdown += `- Всего заметок: ${notes.length}\n`;
        notes.forEach((n) => {
          const preview = n.text.substring(0, 100) + (n.text.length > 100 ? "..." : "");
          markdown += `  - [${formatDate(new Date(n.createdAt))}] ${preview}\n`;
        });
        markdown += `\n`;
      }
    }

    if (entities.includes("measurements")) {
      const measurements = await db.measurement
        .findMany({
          where: { userId, date: { gte: start, lte: end } },
          orderBy: { date: "asc" },
        })
        .catch(() => []);

      if (measurements.length > 0) {
        const byType = new Map<string, { first: number; last: number }>();
        measurements.forEach((m) => {
          const entry = byType.get(m.type);
          if (!entry) {
            byType.set(m.type, { first: m.value, last: m.value });
          } else {
            entry.last = m.value;
          }
        });

        markdown += `## Замеры тела\n`;
        byType.forEach(({ first, last }, type) => {
          const delta = last - first;
          const sign = delta > 0 ? "+" : "";
          const unit = type === "weight" ? "кг" : "см";
          if (Math.abs(delta) > 0.01) {
            markdown += `- ${type}: ${first} → ${last} ${unit} (${sign}${delta.toFixed(1)})\n`;
          } else {
            markdown += `- ${type}: ${last} ${unit}\n`;
          }
        });
        markdown += `\n`;
      }
    }

    if (entities.includes("gym")) {
      const workouts = await db.gymWorkout
        .findMany({
          where: {
            period: { userId },
            status: "completed",
            date: { gte: start, lte: end },
          },
          include: {
            exercises: {
              include: { sets: { orderBy: { createdAt: "asc" } } },
            },
          },
        })
        .catch(() => []);

      if (workouts.length > 0) {
        const totalDuration = workouts.reduce((s, w) => s + (w.duration ?? 0), 0);
        const stretched = workouts.filter((w) => w.stretchingDone).length;

        // Collect max weight per exercise
        const prMap = new Map<string, number>();
        type WorkoutEx = { name: string; sets: { weight: number | null }[] };
        type WorkoutWithEx = { exercises: WorkoutEx[] };
        (workouts as WorkoutWithEx[]).forEach((w) => {
          w.exercises.forEach((ex) => {
            ex.sets.forEach((set) => {
              if (set.weight !== null && set.weight > (prMap.get(ex.name) ?? 0)) {
                prMap.set(ex.name, set.weight);
              }
            });
          });
        });
        const topPRs = Array.from(prMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        markdown += `## Тренировки (зал)\n`;
        markdown += `- Завершённых тренировок: ${workouts.length}\n`;
        if (totalDuration > 0) {
          markdown += `- Суммарное время: ${totalDuration} мин (среднее: ${Math.round(totalDuration / workouts.length)} мин)\n`;
        }
        markdown += `- Растяжка после: ${stretched}/${workouts.length}\n`;
        if (topPRs.length > 0) {
          markdown += `- Топ веса за период: ${topPRs.map(([name, w]) => `${name} ${w} кг`).join(", ")}\n`;
        }
        markdown += `\n`;
      } else {
        markdown += `## Тренировки (зал)\n- Тренировок за период не зафиксировано\n\n`;
      }
    }

    if (entities.includes("finances")) {
      const transactions = await db.transaction
        .findMany({
          where: { userId, date: { gte: start, lte: end } },
          include: { category: true },
          orderBy: { date: "asc" },
        })
        .catch(() => []);

      if (transactions.length > 0) {
        const income = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const expenses = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
        const balance = income + expenses;

        // Top expense categories
        const catMap = new Map<string, number>();
        transactions
          .filter((t) => t.amount < 0 && t.category)
          .forEach((t) => {
            const name = t.category!.name;
            catMap.set(name, (catMap.get(name) ?? 0) + Math.abs(t.amount));
          });
        const topCats = Array.from(catMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        markdown += `## Финансы\n`;
        markdown += `- Доходы: +${income.toFixed(0)}\n`;
        markdown += `- Расходы: ${expenses.toFixed(0)}\n`;
        markdown += `- Баланс за период: ${balance >= 0 ? "+" : ""}${balance.toFixed(0)}\n`;
        if (topCats.length > 0) {
          markdown += `- Топ категорий расходов: ${topCats.map(([name, sum]) => `${name} (${sum.toFixed(0)})`).join(", ")}\n`;
        }
        markdown += `\n`;
      }
    }

    // Leak Engine — weekly analysis section
    if (entities.includes("leaks")) {
      markdown += `## 🔍 Лики (найденные паттерны за неделю)\n\n`;
      try {
        // Get Monday of current week from start date
        const refDate = new Date(start);
        const day = refDate.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        refDate.setDate(refDate.getDate() + diff);
        refDate.setHours(0, 0, 0, 0);

        // Build per-day data for leak detection
        const weekEnd = new Date(refDate);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const [wDailyStates, wCheckins, wRituals] = await Promise.all([
          db.dailyState.findMany({ where: { userId, date: { gte: refDate, lt: weekEnd } } }),
          db.dailyCheckin.findMany({ where: { userId, date: { gte: refDate, lt: weekEnd } } }),
          db.ritualCompletion.findMany({ where: { userId, date: { gte: refDate, lt: weekEnd } } }),
        ]);

        const lowEnergyDays = wCheckins.filter(
          (c) => c.type === "morning" && c.energy !== null && c.energy <= 4
        ).length;
        const missedCheckins = 7 - wCheckins.filter((c) => c.type === "morning").length;
        const lowRitualDays = (() => {
          const byDate = new Map<string, { total: number; done: number }>();
          wRituals.forEach((r) => {
            const d = r.date.toISOString().split("T")[0];
            const entry = byDate.get(d) || { total: 0, done: 0 };
            entry.total++;
            if (r.completed) entry.done++;
            byDate.set(d, entry);
          });
          return Array.from(byDate.values()).filter((v) => v.total > 0 && v.done / v.total < 0.5)
            .length;
        })();
        const avgMood = (() => {
          const moods = wDailyStates.filter((s) => s.mood !== null).map((s) => s.mood as number);
          return moods.length > 0
            ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)
            : null;
        })();

        if (lowEnergyDays >= 2)
          markdown += `- ⚠️ Низкая утренняя энергия: ${lowEnergyDays} дней (≤4/10)\n`;
        if (missedCheckins >= 3) markdown += `- ⚠️ Пропущено чекапов: ${missedCheckins}/7\n`;
        if (lowRitualDays >= 3)
          markdown += `- ⚠️ Ритуалы выполнены <50% в ${lowRitualDays} из 7 дней\n`;
        if (avgMood && parseFloat(avgMood) < 6)
          markdown += `- ⚠️ Среднее настроение низкое: ${avgMood}/10\n`;
        if (lowEnergyDays < 2 && missedCheckins < 3 && lowRitualDays < 3)
          markdown += `- ✅ Критических ликов не обнаружено\n`;
      } catch {
        markdown += `- Нет данных для анализа ликов\n`;
      }
      markdown += `\n`;
    }

    // Add footer
    markdown += `---\n`;
    markdown += `_Сгенерировано LeakFixer Buddy ${formatDate(new Date())}_\n`;

    return NextResponse.json({ markdown, dateRange });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
