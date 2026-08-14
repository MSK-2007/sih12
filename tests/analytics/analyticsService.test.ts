import { describe, it, expect } from 'vitest';

describe('Analytics & Baseline Comparison Calculations', () => {
  it('should calculate baseline vs ResQAI percentage improvement correctly', () => {
    // Formula for lower is better: (baseline - resqai) / baseline * 100
    const baseline = 10.0;
    const resqai = 7.5;
    const improvement = ((baseline - resqai) / baseline) * 100;

    expect(improvement).toBe(25.0);
  });

  it('should handle zero or null baseline gracefully without dividing by zero', () => {
    const safeCalc = (b: number | null, r: number | null) => {
      if (b == null || r == null || b === 0) return null;
      return ((b - r) / b) * 100;
    };

    expect(safeCalc(0, 5)).toBe(null);
    expect(safeCalc(null, 5)).toBe(null);
    expect(safeCalc(10, null)).toBe(null);
  });
});
