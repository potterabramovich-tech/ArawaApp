import { ImageEffectProcessingCoordinator } from '../effects/processing/processingCoordinator';
import { ProcessingOutputStore } from '../effects/processing/outputStore';
import { ImageEffectProcessorRegistry } from '../effects/processing/processorRegistry';
import type { ProcessingSessionEvent } from '../effects/processing/processingSession';
import type {
  ImageEffectProcessor,
  ImageProcessingRequest,
  ImageProcessingResult,
} from '../effects/processing/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function request(id: string, uri = 'file:///original.jpg'): ImageProcessingRequest {
  return {
    id,
    source: { fileName: 'original.jpg', mimeType: 'image/jpeg', uri },
    plan: { presetId: 'arawa-aura', intensity: 50, operation: 'render-preset' },
  };
}

function derivative(
  nextRequest: ImageProcessingRequest,
  uri = `file:///rendered-${nextRequest.id}.jpg`,
): ImageProcessingResult {
  return {
    engineId: 'renderer',
    kind: 'derivative',
    media: { fileName: 'rendered.jpg', mimeType: 'image/jpeg', uri },
    requestId: nextRequest.id,
    sourceUri: nextRequest.source.uri,
  };
}

function createRenderer() {
  const jobs = new Map<string, ReturnType<typeof deferred<ImageProcessingResult>>>();
  const processor: ImageEffectProcessor = {
    id: 'renderer',
    capabilities: {
      stillImageProcessing: true,
      previewOverlay: false,
      nativePixelProcessing: true,
      gpuProcessing: false,
      realtimeCameraProcessing: false,
      localSceneAnalysis: false,
      provenanceMetadata: false,
    },
    canProcess: (plan) => plan.operation === 'render-preset',
    process: jest.fn((nextRequest: ImageProcessingRequest) => {
      const job = deferred<ImageProcessingResult>();
      jobs.set(nextRequest.id, job);
      return job.promise;
    }),
    cancel: jest.fn(),
    release: jest.fn().mockResolvedValue(undefined),
  };
  return { jobs, processor };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('processing coordinator lifecycle', () => {
  it('cancels a superseded request and releases its stale derivative', async () => {
    const { jobs, processor } = createRenderer();
    const coordinator = new ImageEffectProcessingCoordinator(
      new ImageEffectProcessorRegistry([processor]),
      new ProcessingOutputStore(),
    );
    const events: ProcessingSessionEvent[] = [];
    const first = request('first');
    const second = request('second');

    coordinator.start(first, (event) => events.push(event));
    coordinator.start(second, (event) => events.push(event));
    jobs.get(first.id)?.resolve(derivative(first));
    jobs.get(second.id)?.resolve(derivative(second));
    await flush();

    expect(processor.cancel).toHaveBeenCalledWith(first.id);
    expect(processor.release).toHaveBeenCalledWith(derivative(first));
    expect(events.filter(({ type }) => type === 'processing-succeeded')).toEqual([
      { type: 'processing-succeeded', result: derivative(second) },
    ]);
  });

  it.each(['retake', 'source replacement', 'unmount', 'route re-entry'])(
    'releases an accepted derivative during %s cancellation',
    async () => {
      const { jobs, processor } = createRenderer();
      const coordinator = new ImageEffectProcessingCoordinator(
        new ImageEffectProcessorRegistry([processor]),
        new ProcessingOutputStore(),
      );
      const active = request('active');
      coordinator.start(active, jest.fn());
      jobs.get(active.id)?.resolve(derivative(active));
      await flush();

      coordinator.cancel(active.id);
      await flush();

      expect(processor.release).toHaveBeenCalledWith(derivative(active));
    },
  );

  it('rejects invalid processor metadata and never releases the original URI', async () => {
    const { jobs, processor } = createRenderer();
    const coordinator = new ImageEffectProcessingCoordinator(
      new ImageEffectProcessorRegistry([processor]),
      new ProcessingOutputStore(),
    );
    const events: ProcessingSessionEvent[] = [];
    const active = request('active');

    coordinator.start(active, (event) => events.push(event));
    jobs.get(active.id)?.resolve({
      ...derivative(active, active.source.uri),
      sourceUri: 'file:///forged-source.jpg',
    });
    await flush();

    expect(events.at(-1)).toMatchObject({
      type: 'processing-failed',
      error: { code: 'invalid-result' },
    });
    expect(processor.release).not.toHaveBeenCalled();
  });


  it('cleans a non-source URI even when a processor mislabeled it as identity', async () => {
    const { jobs, processor } = createRenderer();
    const coordinator = new ImageEffectProcessingCoordinator(
      new ImageEffectProcessorRegistry([processor]),
      new ProcessingOutputStore(),
    );
    const active = request('active');
    const mislabeled: ImageProcessingResult = {
      ...derivative(active, 'file:///unexpected-output.jpg'),
      kind: 'identity',
    };

    coordinator.start(active, jest.fn());
    jobs.get(active.id)?.resolve(mislabeled);
    await flush();

    expect(processor.release).toHaveBeenCalledWith(mislabeled);
  });
  it('retries failed derivative cleanup on the next lifecycle start', async () => {
    const { jobs, processor } = createRenderer();
    const release = jest
      .fn()
      .mockRejectedValueOnce(new Error('busy'))
      .mockResolvedValueOnce(undefined);
    processor.release = release;
    const outputs = new ProcessingOutputStore();
    const coordinator = new ImageEffectProcessingCoordinator(
      new ImageEffectProcessorRegistry([processor]),
      outputs,
    );
    const first = request('first');

    coordinator.start(first, jest.fn());
    jobs.get(first.id)?.resolve(derivative(first));
    await flush();
    coordinator.cancel(first.id);
    await flush();
    expect(outputs.owns(derivative(first).media.uri)).toBe(true);

    coordinator.start(request('second'), jest.fn());
    await flush();

    expect(release).toHaveBeenCalledTimes(2);
    expect(outputs.owns(derivative(first).media.uri)).toBe(false);
  });

  it('maps synchronous processor and cancellation failures without throwing', async () => {
    const processor: ImageEffectProcessor = {
      ...createRenderer().processor,
      process: () => {
        throw new Error('sync process failure');
      },
      cancel: () => {
        throw new Error('sync cancel failure');
      },
    };
    const coordinator = new ImageEffectProcessingCoordinator(
      new ImageEffectProcessorRegistry([processor]),
      new ProcessingOutputStore(),
    );
    const events: ProcessingSessionEvent[] = [];

    expect(() => coordinator.start(request('failure'), (event) => events.push(event))).not.toThrow();
    await flush();

    expect(events.at(-1)).toMatchObject({
      type: 'processing-failed',
      error: { code: 'processing-failed' },
    });
    expect(() => coordinator.cancel()).not.toThrow();
  });

  it('contains a synchronous cancellation failure', () => {
    const processor: ImageEffectProcessor = {
      ...createRenderer().processor,
      process: () => new Promise(() => undefined),
      cancel: () => {
        throw new Error('sync cancel failure');
      },
    };
    const coordinator = new ImageEffectProcessingCoordinator(
      new ImageEffectProcessorRegistry([processor]),
      new ProcessingOutputStore(),
    );
    const active = request('pending');

    coordinator.start(active, jest.fn());

    expect(() => coordinator.cancel(active.id)).not.toThrow();
  });
});
