import { describe, it, expect } from 'vitest';
import { withdrawFormSchema } from '@/lib/validation';

describe('Validation Schema', () => {
  it('should validate correct form data', () => {
    const validData = {
      amount: 100,
      destination: '0x1234567890abcdef',
      confirm: true,
    };

    const result = withdrawFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject negative amount', () => {
    const invalidData = {
      amount: -50,
      destination: '0x1234',
      confirm: true,
    };

    const result = withdrawFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('greater than 0');
    }
  });

  it('should reject zero amount', () => {
    const invalidData = {
      amount: 0,
      destination: '0x1234',
      confirm: true,
    };

    const result = withdrawFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('greater than 0');
    }
  });

  it('should reject empty destination', () => {
    const invalidData = {
      amount: 100,
      destination: '',
      confirm: true,
    };

    const result = withdrawFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('required');
    }
  });

  it('should trim destination whitespace', () => {
    const dataWithSpaces = {
      amount: 100,
      destination: '  0x1234  ',
      confirm: true,
    };

    const result = withdrawFormSchema.safeParse(dataWithSpaces);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.destination).toBe('0x1234');
    }
  });

  it('should reject when confirm is false', () => {
    const invalidData = {
      amount: 100,
      destination: '0x1234',
      confirm: false,
    };

    const result = withdrawFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('confirm');
    }
  });

  it('should reject Infinity as amount', () => {
    const invalidData = {
      amount: Infinity,
      destination: '0x1234',
      confirm: true,
    };

    const result = withdrawFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_type');
    }
  });

  it('should collect multiple validation errors', () => {
    const invalidData = {
      amount: -10,
      destination: '',
      confirm: false,
    };

    const result = withdrawFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});
