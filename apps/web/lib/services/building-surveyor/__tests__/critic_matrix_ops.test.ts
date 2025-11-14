/**
 * Unit tests for CriticModule matrix operations
 */

import { CriticModule } from '../critic';

describe('CriticModule Matrix Operations', () => {
  // Note: These tests access private methods via reflection or we test through public API
  // Since methods are private, we'll test the behavior through the public selectArm method

  describe('Matrix Inverse', () => {
    it('should handle positive definite matrices', async () => {
      // Create a simple positive definite matrix (identity-like)
      // Test through context vector validation
      const context = Array(12).fill(0.5);
      
      // This should not throw
      await expect(
        CriticModule.selectArm({
          context,
          delta_safety: 0.1,
        })
      ).resolves.toBeDefined();
    });

    it('should handle near-singular matrices gracefully', async () => {
      // Very small values might cause numerical issues
      const context = Array(12).fill(0.001);
      
      await expect(
        CriticModule.selectArm({
          context,
          delta_safety: 0.1,
        })
      ).resolves.toBeDefined();
    });

    it('should handle edge case: all zeros', async () => {
      const context = Array(12).fill(0);
      
      await expect(
        CriticModule.selectArm({
          context,
          delta_safety: 0.1,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('Context Vector Validation', () => {
    it('should accept valid 12-dimensional context', async () => {
      const context = Array(12).fill(0.5);
      
      const result = await CriticModule.selectArm({
        context,
        delta_safety: 0.1,
      });

      expect(result).toBeDefined();
      expect(result.arm).toBeDefined();
    });

    it('should handle context with extreme values', async () => {
      const context = Array(12).fill(1.0);
      
      await expect(
        CriticModule.selectArm({
          context,
          delta_safety: 0.1,
        })
      ).resolves.toBeDefined();
    });
  });
});

