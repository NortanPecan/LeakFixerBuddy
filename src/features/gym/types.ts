/**
 * GYM module shared types
 */

export interface GymExerciseSet {
  id: string;
  setNum: number;
  weight?: number;
  reps?: number;
  duration?: number;
  completed: boolean;
  isWarmup?: boolean;
  notes?: string;
}

export interface GymExerciseTemplate {
  id: string;
  name: string;
  currentWeight?: number;
  nextWeight?: number;
  defaultScheme?: string;
  defaultReps?: number;
  defaultSets?: number;
  progressionStep?: number;
  techniqueNotes?: string;
}

export interface GymExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  order: number;
  sets: GymExerciseSet[];
  templateId?: string;
  repsScheme?: string;
  targetReps?: number;
  targetSets?: number;
  weight?: number;
  nextWeight?: number;
  workoutTemplateExerciseId?: string;
  includeInFutureCycles?: boolean;
  template?: GymExerciseTemplate;
}

export interface GymWorkout {
  id: string;
  date: string;
  dayOfWeek: number;
  workoutNum: number;
  name: string | null;
  muscleGroups?: string[];
  duration: number | null;
  completed: boolean;
  exercises?: GymExercise[];
  skipped?: boolean;
  status?: "planned" | "in_progress" | "completed" | "skipped" | "rescheduled";
  wellbeing?: number;
  wellbeingNote?: string;
  additionalActivities?: AdditionalActivity[];
}

export interface AdditionalActivity {
  type: "walk" | "abs" | "plank" | "bike" | "other";
  value: string;
  label?: string;
}

export interface GymPeriod {
  id: string;
  name: string;
  type: string;
  cycleLength: number;
  workoutsPerCycle: number;
  totalCycles: number;
  currentCycle: number;
  currentDay: number;
  isActive: boolean;
  startDate: string;
  daySchedule?: string;
}
