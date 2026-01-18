import React from 'react';
import Layout from '@/components/Layout';
import { useHabits } from '@/hooks/useHabits';
import { HabitItem } from '@/components/habits/HabitItem';
import { AddHabitForm } from '@/components/habits/AddHabitForm';
import { HabitProgress } from '@/components/habits/HabitProgress';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ListChecks } from 'lucide-react';

const Habits: React.FC = () => {
  const {
    habits,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    isCompleted,
    completedCount,
    totalCount,
    progress,
    allCompletedToday,
  } = useHabits();

  const today = new Date();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">
            Daily Habits
          </h1>
          <p className="text-muted-foreground font-body">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Progress */}
        <HabitProgress
          completedCount={completedCount}
          totalCount={totalCount}
          progress={progress}
          allCompletedToday={allCompletedToday}
        />

        {/* Add Habit Form */}
        <AddHabitForm onAdd={addHabit} />

        {/* Habits List */}
        <div className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : habits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-body">No habits yet. Add your first one above!</p>
            </div>
          ) : (
            habits.map((habit) => (
              <div key={habit.id} className="group">
                <HabitItem
                  id={habit.id}
                  name={habit.name}
                  isCompleted={isCompleted(habit.id)}
                  onToggle={() => toggleCompletion(habit.id)}
                  onUpdate={(name) => updateHabit(habit.id, name)}
                  onDelete={() => deleteHabit(habit.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Habits;
