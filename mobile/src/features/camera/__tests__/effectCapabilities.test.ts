import {
  getImageEffectAvailability,
  resolvePreviewTreatment,
} from '../effects/capabilities';
import { ARACAM_SIGNATURE_PRESETS, getImageEffectPreset } from '../effects/presets';
import type { ImageEffectCapabilities, ImageEffectPreset } from '../effects/types';

const previewCapabilities: ImageEffectCapabilities = {
  platform: 'ios',
  previewOverlay: true,
  nativePixelProcessing: false,
  gpuProcessing: false,
  realtimeCameraProcessing: false,
  localSceneAnalysis: false,
  provenanceMetadata: false,
};

describe('AraCam signature preset catalog', () => {
  it('contains only the curated Original, Aura, Ember, and Nightglass identities', () => {
    expect(ARACAM_SIGNATURE_PRESETS.map(({ id, displayName }) => ({ id, displayName }))).toEqual([
      { id: 'original', displayName: 'Original' },
      { id: 'arawa-aura', displayName: 'Aura' },
      { id: 'ember-veil', displayName: 'Ember' },
      { id: 'nightglass', displayName: 'Nightglass' },
    ]);
  });

  it('defines typed category, availability, intensity, and processing metadata for every preset', () => {
    for (const preset of ARACAM_SIGNATURE_PRESETS) {
      expect(preset.category).toBeTruthy();
      expect(preset.defaultIntensity).toBeGreaterThanOrEqual(0);
      expect(preset.defaultIntensity).toBeLessThanOrEqual(100);
      expect(preset.processing.memoryClass).toBe('minimal');
      expect(preset.processing.pipeline).toMatch(/^(none|preview-overlay)$/);
    }
  });
});

describe('effect capability degradation', () => {
  it('reports current effects honestly as preview-only', () => {
    const availability = getImageEffectAvailability(
      getImageEffectPreset('arawa-aura'),
      previewCapabilities,
    );

    expect(availability).toEqual({
      available: true,
      mode: 'preview-only',
      reason: 'Preview only. The original media remains unchanged for save and share.',
    });
  });

  it('keeps Original universally available without processing', () => {
    expect(
      getImageEffectAvailability(getImageEffectPreset('original'), {
        ...previewCapabilities,
        previewOverlay: false,
      }),
    ).toEqual({ available: true, mode: 'original', reason: null });
  });

  it('disables a future native preset when its required capability is absent', () => {
    const futureNativePreset: ImageEffectPreset = {
      id: 'nightglass',
      displayName: 'Future native look',
      category: 'atmosphere',
      defaultIntensity: 50,
      processing: {
        pipeline: 'native-pixel-pipeline',
        executionMode: 'none',
        memoryClass: 'moderate',
        requirements: ['native-pixel-processing'],
      },
      previewTreatment: null,
    };

    expect(getImageEffectAvailability(futureNativePreset, previewCapabilities)).toEqual({
      available: false,
      mode: 'unavailable',
      reason: 'Requires native pixel processing.',
    });
  });

  it.each([
    [
      'gpu-processing',
      { nativePixelProcessing: true, gpuProcessing: false, realtimeCameraProcessing: true },
      'Requires gpu processing.',
    ],
    [
      'native-pixel-processing',
      { nativePixelProcessing: false, gpuProcessing: true, realtimeCameraProcessing: true },
      'Requires native pixel processing.',
    ],
    [
      'realtime-camera-processing',
      { nativePixelProcessing: true, gpuProcessing: true, realtimeCameraProcessing: false },
      'Requires realtime camera processing.',
    ],
    [
      'local-scene-analysis',
      { nativePixelProcessing: true, gpuProcessing: true, realtimeCameraProcessing: true },
      'Requires local scene analysis.',
    ],
  ] as const)(
    'gates %s independently from other processing capabilities',
    (requirement, capabilityOverrides, expectedReason) => {
      const preset: ImageEffectPreset = {
        id: 'nightglass',
        displayName: 'Future capability look',
        category: 'enhancement',
        defaultIntensity: 50,
        processing: {
          pipeline: 'native-pixel-pipeline',
          executionMode: 'realtime-camera',
          memoryClass: 'moderate',
          requirements: [requirement],
        },
        previewTreatment: null,
      };

      expect(
        getImageEffectAvailability(preset, {
          ...previewCapabilities,
          ...capabilityOverrides,
          localSceneAnalysis: false,
        }),
      ).toEqual({ available: false, mode: 'unavailable', reason: expectedReason });
    },
  );

  it('enforces pipeline and realtime execution gates even when optional requirements are omitted', () => {
    const misconfiguredPreset: ImageEffectPreset = {
      id: 'nightglass',
      displayName: 'Future realtime look',
      category: 'enhancement',
      defaultIntensity: 50,
      processing: {
        pipeline: 'native-pixel-pipeline',
        executionMode: 'realtime-camera',
        memoryClass: 'moderate',
        requirements: [],
      },
      previewTreatment: null,
    };

    expect(getImageEffectAvailability(misconfiguredPreset, previewCapabilities)).toEqual({
      available: false,
      mode: 'unavailable',
      reason: 'Requires native pixel processing.',
    });
    expect(
      getImageEffectAvailability(misconfiguredPreset, {
        ...previewCapabilities,
        nativePixelProcessing: true,
      }),
    ).toEqual({
      available: false,
      mode: 'unavailable',
      reason: 'Requires realtime camera processing.',
    });
  });

  it('scales only the lightweight preview treatment and never mutates pixel data', () => {
    const preset = getImageEffectPreset('ember-veil');
    const availability = getImageEffectAvailability(preset, previewCapabilities);

    expect(resolvePreviewTreatment(preset, 0, availability)).toEqual({
      kind: 'none',
      opacity: 0,
    });
    expect(resolvePreviewTreatment(preset, 50, availability)).toEqual({
      kind: 'overlay',
      color: '#FF7048',
      opacity: 0.09,
    });
  });
});
