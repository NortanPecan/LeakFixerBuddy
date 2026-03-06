# LeakFixer Buddy - Worklog

## Task ID: GYM-v1.1
## Agent: Main Agent
## Task: GYM Module Fixes and Improvements v1.1

---

### Work Log:

1. **Analyzed current GYM module implementation**
   - Reviewed GymScreen.tsx (1549 lines)
   - Reviewed API routes (gym/route.ts, workouts/skip, workouts/reschedule)
   - Identified issues with daySchedule handling and order preservation

2. **Fixed Bug: Rest days moving to end in daySchedule**
   - Root cause: daySchedule was not being sorted by dayNum when loaded
   - Fix: Added sort by dayNum when parsing daySchedule from database
   - Location: `useEffect` hook in GymScreen.tsx that parses `activePeriod.daySchedule`

3. **Improved Wizard with 3-step flow**
   - Step 1: Template selection OR manual configuration
   - Step 2: Configure workout names and muscle groups
   - Step 3: Order days with drag-and-drop + calendar preview

4. **Added Templates Selection in Wizard**
   - 5 built-in templates:
     - Верх/Низ (4 за 6)
     - PPL (3 за 6)
     - Классический сплит (4 за 7)
     - Фулбоди (3 за 7)
     - Интенсив (5 за 5)
   - Templates preserve exact day order (rest days in correct positions)
   - One-click setup with ability to customize after selection

5. **Implemented Drag-and-Drop for Cycle Schema**
   - Both in wizard (step 3) and in active period view
   - Visual feedback during drag (ring highlight on drop target)
   - Cursor changes (grab/grabbing)
   - Save button appears only when schedule is modified

6. **Added Calendar Preview in Wizard**
   - Shows 2-week preview of how schedule maps to calendar
   - Updates in real-time as days are reordered
   - Color-coded: workout days (primary color), rest days (muted)

7. **Added Toggle Day Type Feature**
   - Click on any day in wizard step 3 to toggle workout/rest
   - Automatically renumbers workouts when toggling
   - Maintains correct workout count

8. **Improved Skip Workout Functionality**
   - Added `shiftSchedule` parameter to skip API
   - When enabled:
     - Removes the skipped workout
     - Shifts all future workouts back by 1 day
     - Creates replacement workout at the end based on daySchedule
   - Clear feedback message after skip

9. **Improved Reschedule Workout**
   - Added date picker UI in workout detail dialog
   - Shows "Перенести" button for uncompleted workouts
   - Swaps with existing workout if target date is occupied

10. **Added PATCH endpoint for daySchedule updates**
    - Updates period's daySchedule in database
    - Updates future workout names/muscle groups based on new schedule
    - Calculates correct day in cycle for each future workout

---

### Stage Summary:

**Implemented Features:**
- ✅ Fixed rest days order bug
- ✅ Drag-and-drop for cycle schema (wizard + active period)
- ✅ Calendar preview in wizard
- ✅ Templates selection with one-click setup
- ✅ Toggle day type (workout/rest) in wizard
- ✅ Skip workout with schedule shift
- ✅ Reschedule workout with date picker
- ✅ PATCH API for daySchedule updates

**Key Decisions:**
1. **Templates over manual setup**: Prioritized quick-start with templates, but kept manual option for power users
2. **Real-time preview**: Calendar preview helps users understand the schedule before creating
3. **Explicit save**: Schedule changes require explicit save button click to prevent accidental modifications
4. **Shift vs delete**: Skip can either delete workout or shift entire schedule - both options available

**Edge Cases Handled:**
- Long periods (up to 24 cycles supported)
- Future workouts get updated when daySchedule changes
- Date picker prevents selecting past dates
- Workouts swap when rescheduling to occupied date

**Potential Future Improvements** (not implemented now):
- Rest day auto-suggestion based on workout intensity
- Workout history analytics (PRs, volume trends)
- Exercise library with personal records
- Auto-progression (increase weights by % each cycle)
- Deload week support
- Export/import period templates

---

### Files Modified:
- `src/components/screens/GymScreen.tsx` - Complete rewrite with v1.1 features
- `src/app/api/gym/route.ts` - Added PATCH endpoint
- `src/app/api/gym/workouts/skip/route.ts` - Improved skip logic with shift option

---

## Task ID: AI-GIT-RULES
## Agent: Main Agent
## Task: Создание конституции Git-правил для AI-помощника

---

### Work Log:

1. **Создан файл `docs/ai-git-rules.md`**
   - Расположение: `/docs/ai-git-rules.md`
   - Содержит полные правила работы с Git

2. **Записанные правила:**
   - Полный запрет на `git reset`, `git rebase`, `git push --force` без подтверждения
   - По умолчанию использовать `git revert` для отката
   - Осмысленные коммиты, не работать «в воздухе»
   - Обязательное согласование опасных действий (миграции БД, массовые удаления, рефакторинг)
   - Крупные изменения в отдельных ветках, `master`/`main` — стабильная ветка

3. **Добавлен обязательный пункт:**
   > «Перед каждым новым этапом работы (новый модуль, крупной рефакторинг, изменения GYM/Skills/Traits/Export) я обязан перечитать этот файл и свериться, не нарушаю ли правила»

4. **Обновлён README.md**
   - Добавлена ссылка: `🤖 **AI Git Rules**: [docs/ai-git-rules.md](./docs/ai-git-rules.md) — **обязательно к прочтению AI‑помощником**`

---

### Stage Summary:

**Файл-конституция:** `docs/ai-git-rules.md`

**Обязательство:**
Перед каждым новым этапом работы я (GLM‑5) буду перечитывать `docs/ai-git-rules.md` и сверяться с правилами. Это моя «конституция по Git».

**Файлы созданы/изменены:**
- `docs/ai-git-rules.md` — новый файл с правилами
- `README.md` — добавлена ссылка на правила
