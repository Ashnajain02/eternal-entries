import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

export interface Habit {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_date: string;
}

export function useHabits() {
  const { authState } = useAuth();
  const user = authState.user;
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCompletedToday, setAllCompletedToday] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchHabits = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  }, [user]);

  const fetchTodayCompletions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('completed_date', today);

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  }, [user, today]);

  const checkAllCompleted = useCallback(async () => {
    if (!user || habits.length === 0) return;

    const completedHabitIds = new Set(completions.map(c => c.habit_id));
    const allDone = habits.every(h => completedHabitIds.has(h.id));

    if (allDone && !allCompletedToday) {
      // Check if we already logged this day
      const { data: existing } = await supabase
        .from('daily_all_habits_completed')
        .select('id')
        .eq('completed_date', today)
        .single();

      if (!existing) {
        // Log the completion
        await supabase
          .from('daily_all_habits_completed')
          .insert({ user_id: user.id, completed_date: today });

        // Fire confetti!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });

        toast({
          title: "🎉 All habits completed!",
          description: "Amazing work today! Keep it up!",
        });
      }

      setAllCompletedToday(true);
    }
  }, [user, habits, completions, allCompletedToday, today, toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHabits(), fetchTodayCompletions()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user, fetchHabits, fetchTodayCompletions]);

  useEffect(() => {
    checkAllCompleted();
  }, [completions, habits, checkAllCompleted]);

  const addHabit = async (name: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;
      setHabits(prev => [...prev, data]);
      toast({ title: "Habit added", description: `"${name}" added to your habits.` });
    } catch (error) {
      console.error('Error adding habit:', error);
      toast({ title: "Error", description: "Failed to add habit.", variant: "destructive" });
    }
  };

  const updateHabit = async (id: string, name: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('habits')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
      setHabits(prev => prev.map(h => h.id === id ? { ...h, name } : h));
      toast({ title: "Habit updated" });
    } catch (error) {
      console.error('Error updating habit:', error);
      toast({ title: "Error", description: "Failed to update habit.", variant: "destructive" });
    }
  };

  const deleteHabit = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHabits(prev => prev.filter(h => h.id !== id));
      setCompletions(prev => prev.filter(c => c.habit_id !== id));
      toast({ title: "Habit deleted" });
    } catch (error) {
      console.error('Error deleting habit:', error);
      toast({ title: "Error", description: "Failed to delete habit.", variant: "destructive" });
    }
  };

  const toggleCompletion = async (habitId: string) => {
    if (!user) return;

    const existingCompletion = completions.find(c => c.habit_id === habitId);

    try {
      if (existingCompletion) {
        // Uncomplete
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existingCompletion.id);

        if (error) throw error;
        setCompletions(prev => prev.filter(c => c.id !== existingCompletion.id));
        setAllCompletedToday(false);
      } else {
        // Complete
        const { data, error } = await supabase
          .from('habit_completions')
          .insert({ user_id: user.id, habit_id: habitId, completed_date: today })
          .select()
          .single();

        if (error) throw error;
        setCompletions(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast({ title: "Error", description: "Failed to update completion.", variant: "destructive" });
    }
  };

  const isCompleted = (habitId: string) => {
    return completions.some(c => c.habit_id === habitId);
  };

  const completedCount = completions.length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
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
  };
}
