import { describe, it, expect } from 'vitest';
import { moodLabels } from '../moods';

describe('moodLabels', () => {
  const expectedMoods = [
    'happy', 'content', 'neutral', 'sad', 'anxious',
    'angry', 'emotional', 'in-love', 'excited', 'tired',
  ] as const;

  // Validates all 10 moods are present
  it('contains all 10 mood types', () => {
    expect(Object.keys(moodLabels)).toHaveLength(10);
  });

  // Validates each expected mood has a label
  it.each(expectedMoods)('has a label for "%s"', (mood) => {
    expect(moodLabels[mood]).toBeDefined();
    expect(typeof moodLabels[mood]).toBe('string');
    expect(moodLabels[mood].length).toBeGreaterThan(0);
  });

  // Labels should be human-readable (capitalized, no hyphens)
  it('has properly formatted labels', () => {
    Object.values(moodLabels).forEach((label) => {
      // First character should be uppercase
      expect(label[0]).toBe(label[0].toUpperCase());
      // Should not contain hyphens (those are in the keys, not labels)
      expect(label).not.toContain('-');
    });
  });

  // Validates the in-love special case
  it('formats "in-love" as "In Love"', () => {
    expect(moodLabels['in-love']).toBe('In Love');
  });
});
