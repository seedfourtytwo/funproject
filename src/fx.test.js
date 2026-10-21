import { describe, it, expect } from 'vitest';
import { createFx, burst, shake, flash, floatText, stepFx, MAX_PARTICLES } from './fx.js';

describe('effets', () => {
  it('les éclats disparaissent après leur durée de vie', () => {
    const fx = createFx();
    burst(fx, 100, 100, 1);
    expect(fx.particles.length).toBeGreaterThan(0);
    for (let i = 0; i < 300; i++) stepFx(fx, 1 / 120);
    expect(fx.particles).toHaveLength(0);
  });

  it('jamais plus de MAX_PARTICLES éclats à la fois (le téléphone reste fluide)', () => {
    const fx = createFx();
    for (let i = 0; i < 1000; i++) burst(fx, 100, 100, 2);
    expect(fx.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
  });

  it('le tremblement et le flash s’éteignent tout seuls', () => {
    const fx = createFx();
    shake(fx, 8);
    flash(fx, 0.5);
    for (let i = 0; i < 240; i++) stepFx(fx, 1 / 120);
    expect(fx.shake).toBeLessThan(0.1);
    expect(fx.flash).toBe(0);
  });

  it('un second tremblement plus faible ne réduit pas le premier', () => {
    const fx = createFx();
    shake(fx, 8);
    shake(fx, 2);
    expect(fx.shake).toBe(8);
  });

  it('les textes flottants montent puis disparaissent', () => {
    const fx = createFx();
    floatText(fx, 100, 200, '+300');
    stepFx(fx, 0.1);
    expect(fx.texts[0].y).toBeLessThan(200);
    for (let i = 0; i < 300; i++) stepFx(fx, 1 / 60);
    expect(fx.texts).toHaveLength(0);
  });
});
