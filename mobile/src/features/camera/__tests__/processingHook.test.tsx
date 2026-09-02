import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import type { CameraPhoto } from '../cameraSession';
import { useImageEffectProcessingSession } from '../effects/processing/useImageEffectProcessingSession';
import { ImageEffectProcessorRegistry, unsupportedProcessingCapabilities } from '../effects/processing/processorRegistry';
import { originalProcessor } from '../effects/processing/originalProcessor';
import type { ProcessingSessionState } from '../effects/processing/processingSession';
import type { ImageEffectProcessor, ImageProcessingRequest, ImageProcessingResult } from '../effects/processing/types';
import type { ImageEffectSelectionState } from '../effects/types';

let mockFocus: () => void | (() => void);
let mockBlur: void | (() => void);
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    jest.requireActual('react').useEffect(() => {
      mockFocus = callback;
      mockBlur = callback();
      return () => mockBlur?.();
    }, [callback]);
  },
}));

const photo: CameraPhoto = {
  fileName: 'source.jpg', mimeType: 'image/jpeg', uri: 'file:///source.jpg', saved: false, source: 'camera',
};
const selected: ImageEffectSelectionState = { sourceUri: photo.uri, selectedPresetId: 'arawa-aura', intensity: 50 };
let tree: ReactTestRenderer | undefined;
let changeAppState: (state: AppStateStatus) => void;
let latest: ProcessingSessionState;
let removeListener: jest.Mock;
const initialAppState = AppState.currentState;

function deferred<T>() {
  let resolve!: (result: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function harness() {
  const jobs: { request: ImageProcessingRequest; job: ReturnType<typeof deferred<ImageProcessingResult>> }[] = [];
  const processor: ImageEffectProcessor = {
    id: 'test-native', capabilities: { ...unsupportedProcessingCapabilities, stillImageProcessing: true },
    canProcess: (plan) => plan.operation === 'render-preset',
    process: jest.fn((request) => {
      const job = deferred<ImageProcessingResult>();
      jobs.push({ request, job });
      return job.promise;
    }), cancel: jest.fn(), release: jest.fn(),
  };
  const registry = new ImageEffectProcessorRegistry([originalProcessor, processor]);
  function Probe({ source = photo, selection = selected }: {
    source?: CameraPhoto; selection?: ImageEffectSelectionState;
  }) {
    latest = useImageEffectProcessingSession(source, selection, registry);
    return null;
  }
  function result(index: number): ImageProcessingResult {
    const request = jobs[index]!.request;
    return { engineId: processor.id, kind: 'derivative', requestId: request.id, sourceUri: request.source.uri,
      media: { fileName: 'look.jpg', mimeType: 'image/jpeg', uri: `file:///look-${request.id}.jpg` } };
  }
  return { Probe, jobs, processor, result };
}

beforeEach(() => {
  jest.useFakeTimers();
  AppState.currentState = 'active';
  mockBlur = undefined;
  removeListener = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    changeAppState = callback;
    return { remove: removeListener };
  });
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  jest.restoreAllMocks();
  AppState.currentState = initialAppState;
  jest.useRealTimers();
});
async function advance() { await act(async () => { jest.advanceTimersByTime(120); }); }

describe('real processing-hook lifecycle', () => {
  it('restarts with a fresh request after a batched background/foreground round trip', async () => {
    const { Probe, jobs, processor } = harness();
    await act(async () => { tree = create(<Probe />); });
    await advance();
    await act(async () => { changeAppState('background'); changeAppState('active'); });
    await advance();
    expect(processor.cancel).toHaveBeenCalledWith(jobs[0]!.request.id);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]!.request.id).not.toBe(jobs[1]!.request.id);
  });

  it('debounces rapid selections to the last preset/intensity and routes zero to identity', async () => {
    const { Probe, jobs } = harness();
    await act(async () => { tree = create(<Probe />); });
    for (const intensity of [60, 80, 100]) {
      await act(async () => { tree!.update(<Probe selection={{ ...selected, selectedPresetId: 'nightglass', intensity }} />); });
    }
    await advance();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.request.plan).toMatchObject({ presetId: 'nightglass', intensity: 100 });
    await act(async () => { tree!.update(<Probe selection={{ ...selected, intensity: 0 }} />); });
    await advance();
    expect(latest).toMatchObject({ status: 'ready', result: { kind: 'identity', media: {
      uri: photo.uri, fileName: photo.fileName, mimeType: photo.mimeType,
    } } });
    expect(jobs).toHaveLength(1);
  });

  it('rejects and releases old-source output after preview replacement', async () => {
    const { Probe, jobs, processor, result } = harness();
    await act(async () => { tree = create(<Probe />); });
    await advance();
    await act(async () => { tree!.update(<Probe source={{ ...photo, uri: 'file:///replacement.jpg' }} />); });
    await advance();
    await act(async () => { jobs[1]!.job.resolve(result(1)); jobs[0]!.job.resolve(result(0)); });
    expect(latest).toMatchObject({ status: 'ready', result: { sourceUri: 'file:///replacement.jpg' } });
    expect(processor.release).toHaveBeenCalledWith(result(0));
  });

  it('cancels route blur, ignores late output, and reinitializes on route focus', async () => {
    const { Probe, jobs, processor, result } = harness();
    await act(async () => { tree = create(<Probe />); });
    await advance();
    await act(async () => { mockBlur?.(); });
    await act(async () => { jobs[0]!.job.resolve(result(0)); });
    expect(processor.release).toHaveBeenCalledWith(result(0));
    expect(latest.status).not.toBe('ready');
    await act(async () => { mockBlur = mockFocus(); });
    await advance();
    expect(jobs).toHaveLength(2);
  });

  it('clears a pending timer on unmount/retake before a renderer starts', async () => {
    const { Probe, jobs } = harness();
    await act(async () => { tree = create(<Probe />); });
    await act(async () => { tree!.unmount(); tree = undefined; });
    await advance();
    expect(jobs).toHaveLength(0);
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('releases late native output after unmount without emitting ready state', async () => {
    const { Probe, jobs, processor, result } = harness();
    await act(async () => { tree = create(<Probe />); });
    await advance();
    await act(async () => { tree!.unmount(); tree = undefined; });
    await act(async () => { jobs[0]!.job.resolve(result(0)); });
    expect(processor.release).toHaveBeenCalledWith(result(0));
  });

  it('can retry the same preset/intensity after failure with a new request ID', async () => {
    const { Probe, jobs, result } = harness();
    await act(async () => { tree = create(<Probe />); });
    await advance();
    await act(async () => { jobs[0]!.job.reject(new Error('temporary decode failure')); });
    expect(latest.status).toBe('failure');
    await act(async () => { tree!.update(<Probe selection={{ ...selected }} />); });
    await advance();
    expect(jobs).toHaveLength(2);
    await act(async () => { jobs[1]!.job.resolve(result(1)); });
    expect(latest.status).toBe('ready');
  });
});
