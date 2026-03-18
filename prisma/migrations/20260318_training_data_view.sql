-- ============================================================
-- LLM Training Data View
-- Объединяет ai_logs + user_ai_patterns для обучения модели
--
-- Применить вручную в Supabase SQL Editor
-- ============================================================

DROP VIEW IF EXISTS training_data;

CREATE VIEW training_data AS
SELECT
  al.id,
  al.user_id,
  al.call_type,
  al.leak_type,
  -- Полный контекст (входные данные для обучения)
  al.user_message       AS input_context,
  al.system_prompt      AS system_prompt,
  -- Ответ модели (выходные данные для обучения)
  al.response           AS model_output,
  -- Метаданные
  al.provider,
  al.model,
  al.latency_ms,
  al.success,
  al.created_at         AS generated_at,
  -- Фидбек (сигнал качества для RLHF)
  uap.what_worked       AS positive_feedback,
  uap.tried_solutions   AS all_tried_solutions,
  uap.analysis_count    AS times_analyzed,
  -- Качество примера для обучения:
  -- 'positive' = есть whatWorked, 'neutral' = нет фидбека, 'daily_tip' = совет дня
  CASE
    WHEN al.call_type = 'daily_tip' THEN 'daily_tip'
    WHEN uap.what_worked IS NOT NULL
         AND jsonb_array_length(uap.what_worked::jsonb) > 0 THEN 'positive'
    ELSE 'neutral'
  END AS training_quality
FROM ai_logs al
LEFT JOIN user_ai_patterns uap
  ON al.user_id = uap.user_id
  AND al.leak_type = uap.leak_type
WHERE al.success = true
  -- Исключаем системные вызовы без юзера
  AND al.user_id IS NOT NULL
  -- Исключаем технические внутренние вызовы
  AND al.call_type NOT IN ('tg_classify', 'telegram-classify');

-- Индекс для быстрой выборки по качеству
-- (выполнить если нужно: CREATE INDEX ... ON ai_logs ...)

COMMENT ON VIEW training_data IS
  'Датасет для обучения LLM: input_context -> model_output + feedback сигнал. '
  'Используй training_quality = ''positive'' для fine-tuning на лучших примерах.';
