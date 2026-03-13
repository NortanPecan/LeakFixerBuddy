-- Migration: Fix Journey Course Tables for Supabase
-- Run this in Supabase SQL Editor to fix/add missing columns

-- ============================================
-- FIRST: Add missing columns if they don't exist
-- ============================================

-- Add columns to journey_lessons if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'week') THEN
    ALTER TABLE journey_lessons ADD COLUMN week INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'week_name') THEN
    ALTER TABLE journey_lessons ADD COLUMN week_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'story') THEN
    ALTER TABLE journey_lessons ADD COLUMN story TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'tasks') THEN
    ALTER TABLE journey_lessons ADD COLUMN tasks JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'quote') THEN
    ALTER TABLE journey_lessons ADD COLUMN quote TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'tip') THEN
    ALTER TABLE journey_lessons ADD COLUMN tip TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'reward_xp') THEN
    ALTER TABLE journey_lessons ADD COLUMN reward_xp INTEGER DEFAULT 50;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'unlocks') THEN
    ALTER TABLE journey_lessons ADD COLUMN unlocks TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_lessons' AND column_name = 'achievement') THEN
    ALTER TABLE journey_lessons ADD COLUMN achievement TEXT;
  END IF;
END $$;

-- ============================================
-- SEED DATA: 30 Days of Journey Lessons
-- Full content from JOURNEY_COURSE.md
-- ============================================

-- Clear existing lessons
DELETE FROM journey_lessons;

-- Week 1: Пробуждение
INSERT INTO journey_lessons (day, week, week_name, title, story, tasks, quote, tip, reward_xp, unlocks, achievement) VALUES
(1, 1, 'Пробуждение', 'Добро пожаловать в LeakFixer', 
'Каждый великий путь начинается с первого шага. Сегодня ты начинаешь своё путешествие к лучшей версии себя. LeakFixer — это не просто приложение, это твой компас в мире личного развития. Давай настроим его под тебя!',
'[{"id":"profile_name","type":"action","target":"update_profile_name","description":"Заполнить профиль (имя)","reward":10,"autoVerify":true},{"id":"weight_start","type":"action","target":"set_start_weight","description":"Указать начальный вес","reward":15,"autoVerify":true},{"id":"weight_goal","type":"action","target":"set_target_weight","description":"Установить целевой вес","reward":15,"autoVerify":true},{"id":"choose_goal","type":"action","target":"choose_main_goal","description":"Выбрать главную цель","reward":10,"autoVerify":true}]',
'"Путешествие в тысячу миль начинается с одного шага." — Лао-цзы',
'Начни с честной оценки своего текущего состояния. Это твоя точка отсчёта.',
50, '["profile", "mood", "weight"]', 'first_steps'),

(2, 1, 'Пробуждение', 'Ритуалы — основа изменений',
'Успешные люди отличаются от остальных не тем, что они делают иногда, а тем, что они делают каждый день. Ритуалы — это маленькие действия, которые со временем создают огромные изменения. Сегодня ты создашь свою первую привычку.',
'[{"id":"view_rituals","type":"check","target":"view_rituals_screen","description":"Посмотреть список ритуалов","reward":5,"autoVerify":true},{"id":"add_preset","type":"action","target":"add_ritual_preset","description":"Подключить базовый пакет (12 ритуалов)","reward":20,"autoVerify":true},{"id":"complete_3","type":"complete","target":"complete_rituals","count":3,"description":"Выполнить 3 ритуала","reward":15,"autoVerify":true}]',
'"Мы — это то, что мы делаем постоянно. Совершенство, следовательно, не действие, а привычка." — Аристотель',
'Начни с малого. Лучше делать 3 ритуала каждый день, чем 10 — раз в неделю.',
40, '["rituals"]', 'first_ritual'),

(3, 1, 'Пробуждение', 'Настроение и энергия',
'Настроение — это компас твоего внутреннего состояния. Когда ты научишься его отслеживать, ты поймёшь, что влияет на твою энергию и как её увеличивать. Это суперспособность, которую мы сегодня освоим.',
'[{"id":"mood_morning","type":"action","target":"update_mood","description":"Обновить настроение (утро)","reward":5,"autoVerify":true},{"id":"mood_day","type":"action","target":"update_mood","description":"Обновить настроение (день)","reward":5,"autoVerify":true},{"id":"mood_evening","type":"action","target":"update_mood","description":"Обновить настроение (вечер)","reward":5,"autoVerify":true},{"id":"view_chart","type":"check","target":"view_mood_chart","description":"Посмотреть график настроения","reward":10,"autoVerify":true}]',
'"Энергия и настойчивость преобразуют все вещи." — Михай Чиксентмихайи',
'Записывай настроение в одно и то же время — так ты увидишь более точную картину.',
25, NULL, NULL),

(4, 1, 'Пробуждение', 'Привычки — твои союзники',
'Привычки отличаются от ритуалов тем, что они полностью твои. Ты создаёшь их сам, формируешь под свой образ жизни. Сегодня ты создашь свою первую привычку.',
'[{"id":"create_habit","type":"create","target":"create_habit","count":1,"description":"Создать 1-2 привычки","reward":15,"autoVerify":true},{"id":"complete_habit","type":"complete","target":"complete_habit","description":"Отметить выполнение привычки","reward":10,"autoVerify":true},{"id":"view_stats","type":"check","target":"view_habit_stats","description":"Посмотреть статистику привычек","reward":5,"autoVerify":true}]',
'"Привычка — вторая натура." — Цицерон',
'Лучше всего работают привычки, привязанные к уже существующим действиям. "После чистки зубов я буду..."',
30, '["habits"]', 'habit_creator'),

(5, 1, 'Пробуждение', 'Вода и питание',
'Твоё тело — это храм, и то, что ты в него помещаешь, определяет твою энергию и здоровье. Сегодня мы начнём отслеживать топливо для твоего организма.',
'[{"id":"log_water","type":"action","target":"log_water","description":"Записать выпитую воду","reward":10,"autoVerify":true},{"id":"add_food","type":"action","target":"add_food_entry","description":"Добавить первый приём пищи","reward":15,"autoVerify":true},{"id":"view_summary","type":"check","target":"view_daily_summary","description":"Посмотреть дневную сводку","reward":5,"autoVerify":true}]',
'"Ты — то, что ты ешь." — Людвиг Фейербах',
'Стакан воды утром запускает метаболизм. Попробуй!',
30, '["water", "food"]', NULL),

(6, 1, 'Пробуждение', 'Дела и задачи',
'Хаос в делах приводит к хаосу в голове. Сегодня ты научишься организовывать свои задачи так, чтобы ничего не упускать и успевать больше.',
'[{"id":"create_task","type":"create","target":"create_task","description":"Создать первое дело","reward":10,"autoVerify":true},{"id":"complete_task","type":"complete","target":"complete_task","description":"Выполнить его","reward":15,"autoVerify":true},{"id":"create_chain","type":"create","target":"create_chain","description":"Создать проект (цепочку)","reward":10,"autoVerify":true},{"id":"add_chain_tasks","type":"create","target":"create_task_in_chain","count":2,"description":"Добавить 2 дела в проект","reward":10,"autoVerify":true}]',
'"Съешь лягушку с утра, и всё остальное покажется лёгким." — Брайан Трейси',
'Начинай день с самой важной задачи. Это правило "съешь лягушку".',
45, '["tasks", "chains"]', NULL),

(7, 1, 'Пробуждение', 'Недельный обзор',
'Неделя позади. Время подвести итоги, отметить победы и понять, что можно улучшить. Еженедельный обзор — это ключ к постоянному росту.',
'[{"id":"view_stats","type":"check","target":"view_weekly_stats","description":"Посмотреть статистику за неделю","reward":10,"autoVerify":true},{"id":"reflection","type":"action","target":"complete_reflection","description":"Заполнить рефлексию недели","reward":20,"autoVerify":true},{"id":"adjust_goals","type":"action","target":"adjust_goals","description":"Скорректировать цели","reward":10,"autoVerify":true}]',
'"Не работай усерднее, работай умнее." — Аллен Ф. Мортенсон',
'Выдели 15 минут в воскресенье на обзор недели. Это окупится сторицей.',
100, NULL, 'week_one'),

-- Week 2: Закалка
(8, 2, 'Закалка', 'Здоровье — БАДы',
'Иногда организму нужна дополнительная поддержка. Витамины и добавки могут восполнить дефициты и дать тебе больше энергии. Сегодня настроим твой режим приёма БАДов.',
'[{"id":"add_supplement","type":"create","target":"create_supplement","count":1,"description":"Добавить 1-3 БАДа","reward":15,"autoVerify":true},{"id":"set_schedule","type":"action","target":"set_supplement_schedule","description":"Настроить расписание приёма","reward":10,"autoVerify":true},{"id":"take_supplement","type":"complete","target":"complete_supplement_intake","description":"Отметить приём","reward":10,"autoVerify":true}]',
'"Здоровье — это не всё, но всё без здоровья — ничто." — Сократ',
'Принимай БАДы в одно время с едой — так они лучше усваиваются.',
35, '["supplements", "measurements"]', NULL),

(9, 2, 'Закалка', 'Тренировки — введение',
'Движение — жизнь. Твоё тело создано для активности, и сегодня ты начнёшь свой тренировочный путь. Система GYM в LeakFixer построена на периодах и циклах — это профессиональный подход к тренировкам.',
'[{"id":"create_period","type":"create","target":"create_gym_period","description":"Создать тренировочный период","reward":15,"autoVerify":true},{"id":"set_schedule","type":"action","target":"set_gym_schedule","description":"Настроить расписание тренировок","reward":10,"autoVerify":true},{"id":"learn_cycles","type":"check","target":"view_gym_cycles","description":"Ознакомиться с системой циклов","reward":5,"autoVerify":true}]',
'"Твое тело может всё. Это мозг нужно убедить." — Неизвестный',
'Начни с 3 тренировок в неделю. Этого достаточно для прогресса.',
30, '["gym"]', NULL),

(10, 2, 'Закалка', 'Тренировки — первая практика',
'Теория без практики ничего не стоит. Сегодня ты проведёшь свою первую тренировку в LeakFixer. Не важно, какой уровень — важен сам факт начала.',
'[{"id":"create_workout","type":"create","target":"create_workout","description":"Создать тренировку","reward":15,"autoVerify":true},{"id":"add_exercises","type":"create","target":"add_exercises","count":3,"description":"Добавить 3-5 упражнений","reward":15,"autoVerify":true},{"id":"log_weights","type":"action","target":"log_exercise_weights","description":"Указать веса/подходы/повторы","reward":10,"autoVerify":true},{"id":"complete_workout","type":"complete","target":"complete_workout","description":"Завершить тренировку","reward":20,"autoVerify":true}]',
'"Боль, которую ты чувствуешь сегодня, станет силой, которую ты почувствуешь завтра." — Неизвестный',
'Не гонись за весами. Техника важнее.',
60, NULL, 'first_workout'),

(11, 2, 'Закалка', 'Измерения тела',
'Вес — это не единственный показатель прогресса. Объёмы тела дают более точную картину изменений. Сегодня добавим новые метрики.',
'[{"id":"add_measurements","type":"action","target":"add_body_measurements","description":"Добавить замеры (талия, грудь и т.д.)","reward":15,"autoVerify":true},{"id":"view_history","type":"check","target":"view_weight_history","description":"Посмотреть историю веса","reward":5,"autoVerify":true},{"id":"compare_goal","type":"check","target":"compare_with_goal","description":"Сравнить с целью","reward":5,"autoVerify":true}]',
'"То, что измеряется, улучшается." — Питер Друкер',
'Замеряй тело в одно и то же время суток, лучше утром натощак.',
25, NULL, NULL),

(12, 2, 'Закалка', 'Продвинутые ритуалы',
'Ты уже освоил базовые ритуалы. Теперь пора настроить их под свой ритм жизни. Группировка по времени суток, дни недели, напоминания — всё это сделает твою систему мощнее.',
'[{"id":"group_rituals","type":"action","target":"group_rituals_by_time","description":"Сгруппировать ритуалы по времени","reward":10,"autoVerify":true},{"id":"set_days","type":"action","target":"set_ritual_days","description":"Настроить дни недели для ритуалов","reward":10,"autoVerify":true},{"id":"set_reminders","type":"action","target":"set_ritual_reminders","description":"Настроить напоминания","reward":10,"autoVerify":true}]',
'"Дисциплина — это мост между целями и достижениями." — Джим Рон',
'Утренние ритуалы задают тон всему дню. Начни с них.',
30, NULL, NULL),

(13, 2, 'Закалка', 'Настроение — глубже',
'Ты уже неделю отслеживаешь настроение. Теперь время проанализировать паттерны. Что повышает твою энергию? Что её забирает?',
'[{"id":"mood_charts","type":"check","target":"view_mood_charts","description":"Посмотреть графики настроения","reward":10,"autoVerify":true},{"id":"energy_charts","type":"check","target":"view_energy_charts","description":"Посмотреть графики энергии","reward":10,"autoVerify":true},{"id":"find_patterns","type":"action","target":"note_mood_patterns","description":"Найти корреляции","reward":10,"autoVerify":true}]',
'"Самопознание — начало мудрости." — Сократ',
'Обрати внимание на дни с высокой энергией — что их объединяет?',
30, NULL, NULL),

(14, 2, 'Закалка', 'Недельный обзор #2',
'Вторая неделя завершена. Ты уже чувствуешь изменения? Сравним результаты с началом пути.',
'[{"id":"compare_weeks","type":"check","target":"compare_with_week_1","description":"Сравнить статистику с неделей 1","reward":15,"autoVerify":true},{"id":"reflection","type":"action","target":"complete_reflection","description":"Заполнить рефлексию","reward":20,"autoVerify":true},{"id":"note_wins","type":"action","target":"note_week_wins","description":"Отметить достижения недели","reward":15,"autoVerify":true}]',
'"Прогресс, а не совершенство." — Неизвестный',
'Отметь даже маленькие победы. Они важнее, чем кажется.',
150, NULL, 'week_two'),

-- Week 3: Восхождение
(15, 3, 'Восхождение', 'Направления жизни',
'Куда ты движешься? Без компаса легко заблудиться. Направления жизни — это твои глобальные ориентиры, которые помогут принимать решения каждый день.',
'[{"id":"create_directions","type":"create","target":"create_direction","count":2,"description":"Создать 2-3 направления","reward":20,"autoVerify":true},{"id":"describe_vision","type":"action","target":"describe_direction_vision","description":"Описать видение каждого","reward":15,"autoVerify":true},{"id":"choose_colors","type":"action","target":"set_direction_colors","description":"Выбрать цвета","reward":5,"autoVerify":true}]',
'"Если у тебя нет цели, ты не попадёшь никуда." — Сенека',
'Направления — это не конкретные цели, а векторы движения.',
40, '["directions", "challenges"]', 'compass_set'),

(16, 3, 'Восхождение', 'Челленджи',
'30-дневный челлендж — это мощный инструмент трансформации. Одна конкретная цель, один месяц, ежедневные действия. Сегодня ты создашь свой первый челлендж.',
'[{"id":"create_challenge","type":"create","target":"create_challenge","description":"Создать персональный челлендж","reward":20,"autoVerify":true},{"id":"link_direction","type":"action","target":"link_challenge_to_direction","description":"Привязать к направлению","reward":10,"autoVerify":true},{"id":"mark_first_day","type":"complete","target":"mark_challenge_day","description":"Отметить первый день","reward":10,"autoVerify":true}]',
'"Челлендж — это возможность стать лучше, а не доказать что-то другим." — Неизвестный',
'Выбери челлендж, который реально выполнить. Лучше закончить простой, чем бросить сложный.',
40, NULL, NULL),

(17, 3, 'Восхождение', 'Финансы — основы',
'Деньги — это энергия. Когда ты контролируешь финансы, ты контролируешь часть своей жизни. Сегодня начнём наводить порядок в этой сфере.',
'[{"id":"create_accounts","type":"create","target":"create_account","count":2,"description":"Создать 2-3 счёта","reward":15,"autoVerify":true},{"id":"create_categories","type":"create","target":"create_category","count":3,"description":"Создать категории расходов","reward":15,"autoVerify":true},{"id":"add_transaction","type":"create","target":"create_transaction","description":"Добавить первую транзакцию","reward":10,"autoVerify":true}]',
'"Деньги — хороший слуга, но плохой хозяин." — П.Т. Барнум',
'Начни с отслеживания всех расходов неделю — это откроет глаза.',
40, '["finance"]', NULL),

(18, 3, 'Восхождение', 'Финансы — практика',
'Осознание трат — первый шаг к финансовой свободе. Сегодня ты будешь записывать все расходы и увидишь, куда уходит твоя энергия.',
'[{"id":"track_expenses","type":"action","target":"track_all_expenses","description":"Записывать расходы весь день","reward":20,"autoVerify":true},{"id":"view_summary","type":"check","target":"view_finance_summary","description":"Посмотреть сводку дня","reward":10,"autoVerify":true},{"id":"find_issues","type":"action","target":"identify_problem_categories","description":"Определить проблемные категории","reward":10,"autoVerify":true}]',
'"Богатство — это не то, что ты зарабатываешь, а то, что ты сохраняешь." — Неизвестный',
'Мелкие траты складываются в крупные суммы. Проверь подписки!',
40, NULL, NULL),

(19, 3, 'Восхождение', 'Заметки',
'Память ненадёжна. Заметки — это твой второй мозг. Сегодня мы настроим систему для хранения идей, мыслей и важной информации.',
'[{"id":"create_notes","type":"create","target":"create_note","count":1,"description":"Создать 1-2 заметки","reward":15,"autoVerify":true},{"id":"set_zone","type":"action","target":"set_note_zone","description":"Указать зону заметки","reward":5,"autoVerify":true},{"id":"link_task","type":"action","target":"link_note_to_task","description":"Связать заметку с задачей","reward":10,"autoVerify":true}]',
'"Самые важные мысли приходят в самые неподходящие моменты — запоминай их." — Неизвестный',
'Используй заметки для дневника — это помогает обработать эмоции.',
30, '["notes"]', NULL),

(20, 3, 'Восхождение', 'Контент и обучение',
'Непрерывное обучение — ключ к росту. Книги, курсы, видео — всё это топливо для твоего развития. Давай организуем этот поток.',
'[{"id":"add_content","type":"create","target":"create_content_item","description":"Добавить книгу/курс/видео","reward":15,"autoVerify":true},{"id":"track_progress","type":"action","target":"update_content_progress","description":"Отметить прогресс","reward":10,"autoVerify":true},{"id":"plan_next","type":"action","target":"plan_content_continuation","description":"Запланировать продолжение","reward":10,"autoVerify":true}]',
'"Инвестиции в знания дают лучший процент." — Бенджамин Франклин',
'Выдели 30 минут в день на обучение — это изменит твою жизнь.',
35, '["content"]', NULL),

(21, 3, 'Восхождение', 'Недельный обзор #3',
'Три недели позади. Ты уже освоил почти все функции приложения. Пора подвести итоги и подготовиться к финальному рывку.',
'[{"id":"all_charts","type":"check","target":"view_all_weekly_charts","description":"Все графики за неделю","reward":15,"autoVerify":true},{"id":"finance_summary","type":"check","target":"view_finance_summary","description":"Финансовый итог","reward":10,"autoVerify":true},{"id":"adjust_plans","type":"action","target":"adjust_monthly_plans","description":"Корректировка планов","reward":15,"autoVerify":true},{"id":"reflection","type":"action","target":"complete_reflection","description":"Рефлексия","reward":20,"autoVerify":true}]',
'"Три недели формируют привычку. Ты на полпути к трансформации." — Неизвестный',
'Оцени, какие функции приложения работают лучше всего для тебя.',
200, NULL, 'week_three'),

-- Week 4: Мастерство
(22, 4, 'Мастерство', 'Навыки и качества',
'Какие навыки ты хочешь развить? Какими чертами характера хочешь обладать? Сегодня мы определим области для развития.',
'[{"id":"add_skills","type":"create","target":"create_skill","count":2,"description":"Добавить 2-3 навыка","reward":15,"autoVerify":true},{"id":"add_traits","type":"create","target":"create_trait","count":2,"description":"Добавить 2-3 черты характера","reward":15,"autoVerify":true},{"id":"rate_level","type":"action","target":"rate_current_level","description":"Оценить текущий уровень","reward":10,"autoVerify":true}]',
'"Мастерство — это не цель, а путь." — Роберт Грин',
'Выбери навыки, которые помогут в твоих направлениях жизни.',
40, '["skills", "traits"]', NULL),

(23, 4, 'Мастерство', 'Продвинутые тренировки',
'Ты уже провёл несколько тренировок. Теперь пора оптимизировать программу: шаблоны, прогрессия весов, анализ прогресса.',
'[{"id":"create_template","type":"create","target":"create_workout_template","description":"Создать шаблон тренировки","reward":15,"autoVerify":true},{"id":"progression","type":"action","target":"increase_weights","description":"Увеличить веса (прогрессия)","reward":15,"autoVerify":true},{"id":"analyze","type":"check","target":"analyze_workout_progress","description":"Проанализировать прогресс","reward":10,"autoVerify":true}]',
'"Прогрессия — ключ к росту. Делай немного больше каждый раз." — Неизвестный',
'Увеличивай вес на 2.5-5% каждую неделю — это безопасный прогресс.',
40, NULL, NULL),

(24, 4, 'Мастерство', 'Бадди — партнёры',
'Вместе легче. Партнёр по отчётности — это человек, который поддержит и не даст сдаться. Сегодня найдём тебе бадди.',
'[{"id":"browse_users","type":"check","target":"view_users_list","description":"Посмотреть пользователей","reward":5,"autoVerify":true},{"id":"send_request","type":"action","target":"send_buddy_request","description":"Отправить запрос бадди","reward":15,"autoVerify":true},{"id":"interact","type":"action","target":"buddy_interaction","description":"Начать взаимодействие","reward":20,"autoVerify":true}]',
'"Если хочешь идти быстро — иди один. Если хочешь идти далеко — иди с другими." — Африканская пословица',
'Бадди не обязательно должен быть другом. Это может быть незнакомец с похожими целями.',
40, '["buddies"]', 'not_alone'),

(25, 4, 'Мастерство', 'Экспорт в AI',
'Все твои данные — это золото. AI может проанализировать их и дать персональные рекомендации. Сегодня мы используем эту суперспособность.',
'[{"id":"export_data","type":"action","target":"export_user_data","description":"Экспортировать данные","reward":15,"autoVerify":true},{"id":"ai_analysis","type":"action","target":"send_to_ai","description":"Отправить в AI-ассистента","reward":15,"autoVerify":true},{"id":"get_tips","type":"action","target":"receive_ai_recommendations","description":"Получить рекомендации","reward":10,"autoVerify":true}]',
'"Данные — это новая нефть. AI — это нефтеперерабатывающий завод." — Неизвестный',
'Чем больше данных ты собрал, тем точнее будут рекомендации AI.',
40, '["ai_export", "advanced_features"]', NULL),

(26, 4, 'Мастерство', 'Автоматизация',
'Успех в постоянстве. Напоминания помогут не пропускать важные действия. Настроим систему сигналов.',
'[{"id":"weight_reminder","type":"action","target":"set_weight_reminder","description":"Настроить напоминания о весе","reward":10,"autoVerify":true},{"id":"ritual_reminders","type":"action","target":"set_ritual_reminders","description":"Настроить напоминания о ритуалах","reward":10,"autoVerify":true},{"id":"weekly_reports","type":"action","target":"set_weekly_reports","description":"Настроить еженедельные отчёты","reward":10,"autoVerify":true}]',
'"Автоматизация освобождает время для того, что действительно важно." — Тим Феррис',
'Не переусердствуй с напоминаниями — они могут начать раздражать.',
30, '["reminders"]', NULL),

(27, 4, 'Мастерство', 'Продвинутая аналитика',
'Почти месяц данных! Пора глубоко проанализировать все тренды и найти инсайты.',
'[{"id":"monthly_charts","type":"check","target":"view_monthly_charts","description":"Все графики за месяц","reward":20,"autoVerify":true},{"id":"find_correlations","type":"action","target":"find_data_correlations","description":"Найти корреляции","reward":15,"autoVerify":true},{"id":"identify_trends","type":"action","target":"identify_trends","description":"Определить тренды","reward":15,"autoVerify":true}]',
'"Данные говорят правду, если умеешь их слушать." — Нейт Сильвер',
'Сравни начало и конец месяца — прогресс может удивить.',
50, NULL, NULL),

(28, 4, 'Мастерство', 'Создание своих ритуалов',
'Ты готов создавать уникальные ритуалы, которых нет в базовом пакете. Это твой личный код успеха.',
'[{"id":"create_custom","type":"create","target":"create_custom_ritual","count":2,"description":"Создать 2-3 своих ритуала","reward":20,"autoVerify":true},{"id":"link_skills","type":"action","target":"link_rituals_to_skills","description":"Связать с навыками","reward":15,"autoVerify":true},{"id":"set_schedule","type":"action","target":"set_custom_schedule","description":"Настроить расписание","reward":10,"autoVerify":true}]',
'"Твои ритуалы — это твоя подпись. Сделай их уникальными." — Неизвестный',
'Экспериментируй! Не бойся пробовать новые ритуалы.',
45, NULL, 'ritual_creator'),

(29, 4, 'Мастерство', 'Настройка под себя',
'Завтра финал. Сегодня — последняя настройка системы под твои нужды. Тема, организация, финальные штрихи.',
'[{"id":"set_theme","type":"action","target":"set_app_theme","description":"Выбрать тему оформления","reward":10,"autoVerify":true},{"id":"check_reminders","type":"action","target":"verify_all_reminders","description":"Проверить все напоминания","reward":10,"autoVerify":true},{"id":"organize","type":"action","target":"organize_data","description":"Организовать данные","reward":15,"autoVerify":true}]',
'"Система, которая работает на тебя, — это система, которую ты создал сам." — Неизвестный',
'Подумай, что можно улучшить в твоей системе за следующий месяц.',
35, NULL, NULL),

(30, 4, 'Мастерство', 'Финал и новые горизонты',
'🎉 Поздравляем! Ты прошёл весь курс LeakFixer Journey! 30 дней назад ты начал путь к лучшей версии себя. Сегодня мы подведём итоги и наметим новые горизонты.',
'[{"id":"view_achievements","type":"check","target":"view_all_achievements","description":"Посмотреть все достижения","reward":20,"autoVerify":true},{"id":"full_report","type":"check","target":"view_full_report","description":"Полный отчёт по всем сферам","reward":30,"autoVerify":true},{"id":"plan_next","type":"action","target":"plan_next_month","description":"Написать планы на следующий месяц","reward":25,"autoVerify":true},{"id":"complete","type":"action","target":"complete_journey","description":"Отметить завершение курса","reward":50,"autoVerify":true}]',
'"Конец — это новое начало. Твоё путешествие только начинается." — Неизвестный',
'Ты теперь мастер LeakFixer! Используй эти знания мудро.',
500, NULL, 'journey_master');
