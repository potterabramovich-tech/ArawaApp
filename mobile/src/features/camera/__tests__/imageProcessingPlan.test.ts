import { createImageEffectSelectionState } from '../effects/effectSelection';
import { createImageProcessingRequest, resolveProcessingRequest } from '../effects/processing/orchestrator';
import { originalProcessor } from '../effects/processing/originalProcessor';
import { ImageEffectProcessorRegistry } from '../effects/processing/processorRegistry';
import { createImageEffectRenderPlan } from '../effects/processing/renderPlan';

const source = {
  fileName: 'untouched.heic',
  mimeType: 'image/heic',
  uri: 'file:///untouched.heic',
};

describe('image effect render plans', () => {
  it.each([
    ['original', -10],
    ['original', 100],
    ['arawa-aura', 0],
  ] as const)('creates an explicit identity plan for %s at %i', (presetId, intensity) => {
    expect(createImageEffectRenderPlan(presetId, intensity)).toEqual({
      presetId: 'original',
      intensity: 0,
      operation: 'identity',
    });
  });

  it('clamps renderer-independent preset intensity at both boundaries', () => {
    expect(createImageEffectRenderPlan('arawa-aura', -1).intensity).toBe(0);
    expect(createImageEffectRenderPlan('arawa-aura', 101)).toEqual({
      presetId: 'arawa-aura',
      intensity: 100,
      operation: 'render-preset',
    });
  });
});

describe('Original pass-through processing', () => {
  it('returns the exact source media identity without creating a derivative', async () => {
    const request = createImageProcessingRequest(source, createImageEffectSelectionState(source.uri));
    const result = await originalProcessor.process(request);

    expect(result).toEqual({
      engineId: 'aracam-original-pass-through',
      kind: 'identity',
      media: source,
      requestId: request.id,
      sourceUri: source.uri,
    });
    expect(result.media).toBe(request.source);
  });

  it('rejects a non-identity plan rather than pretending pixels were processed', async () => {
    const request = createImageProcessingRequest(source, {
      sourceUri: source.uri,
      selectedPresetId: 'arawa-aura',
      intensity: 50,
    });

    await expect(originalProcessor.process(request)).rejects.toThrow(
      'only accepts identity render plans',
    );
  });

  it('degrades a preview look when no compatible renderer is registered', () => {
    const request = createImageProcessingRequest(source, {
      sourceUri: source.uri,
      selectedPresetId: 'ember-veil',
      intensity: 50,
    });
    const resolution = resolveProcessingRequest(request, new ImageEffectProcessorRegistry());

    expect(resolution.processor).toBeNull();
    expect(resolution.error).toMatchObject({
      code: 'engine-unavailable',
      recoverable: true,
    });
  });
});
