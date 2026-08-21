import {
  createSignatureStillImageProcessor,
  type PreviewDerivativeStorage,
  type SignatureStillImageRenderer,
} from '../effects/processing/stillImageProcessor';
import type {
  ImageProcessingRequest,
  ImageProcessingResult,
} from '../effects/processing/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function request(id = 'render-1'): ImageProcessingRequest {
  return {
    id,
    source: {
      fileName: 'untouched.heic',
      mimeType: 'image/heic',
      uri: 'file:///untouched.heic',
    },
    plan: { presetId: 'nightglass', intensity: 64, operation: 'render-preset' },
  };
}

function harness(renderer?: SignatureStillImageRenderer) {
  const owned = new Set<string>();
  const remove = jest.fn(async (uri: string) => {
    owned.delete(uri);
  });
  const storage: PreviewDerivativeStorage = {
    owns: (uri) => owned.has(uri),
    remove,
    write: jest.fn(async (fileName: string) => {
      const uri = `file:///cache/aracam/${fileName}`;
      owned.add(uri);
      return uri;
    }),
  };
  const nextRenderer: SignatureStillImageRenderer = renderer ?? {
    render: jest.fn(async () => ({ bytes: new Uint8Array([1, 2, 3]) })),
  };
  return {
    owned,
    remove,
    renderer: nextRenderer,
    storage,
    processor: createSignatureStillImageProcessor(nextRenderer, storage),
  };
}

describe('signature still-image processor safety', () => {
  it('creates an owned screen-preview derivative and leaves Original metadata unchanged', async () => {
    const active = request();
    const sourceBefore = structuredClone(active.source);
    const { processor, renderer, storage } = harness();

    const result = await processor.process(active);

    expect(result).toMatchObject({
      kind: 'derivative',
      sourceUri: active.source.uri,
      media: { mimeType: 'image/jpeg' },
    });
    expect(result.media.uri).not.toBe(active.source.uri);
    expect(active.source).toEqual(sourceBefore);
    expect(renderer.render).toHaveBeenCalledWith(
      active,
      expect.objectContaining({ id: 'nightglass', intensity: 64, version: 1 }),
      'jpeg',
      expect.any(Function),
    );
    expect(storage.write).toHaveBeenCalledTimes(1);
  });

  it('cancels before file creation when a render becomes stale', async () => {
    const pending = deferred<{ bytes: Uint8Array }>();
    const renderer: SignatureStillImageRenderer = {
      render: jest.fn(() => pending.promise),
    };
    const { processor, storage } = harness(renderer);
    const active = request('stale-render');
    const processing = processor.process(active);

    processor.cancel?.(active.id);
    pending.resolve({ bytes: new Uint8Array([1]) });

    await expect(processing).rejects.toThrow('cancelled');
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('removes only the newly written derivative when cancellation races with storage', async () => {
    const writeStarted = deferred<void>();
    const allowWrite = deferred<string>();
    const { processor, storage, owned, remove } = harness();
    storage.write = jest.fn(async () => {
      writeStarted.resolve();
      const uri = await allowWrite.promise;
      owned.add(uri);
      return uri;
    });
    const active = request('write-race');
    const processing = processor.process(active);

    await writeStarted.promise;
    processor.cancel?.(active.id);
    allowWrite.resolve('file:///cache/aracam/write-race.jpg');

    await expect(processing).rejects.toThrow('cancelled');
    expect(remove).toHaveBeenCalledWith('file:///cache/aracam/write-race.jpg');
    expect(remove).not.toHaveBeenCalledWith(active.source.uri);
  });

  it('never releases an Original or an unowned path', async () => {
    const { processor, remove } = harness();
    const active = request();
    const originalResult: ImageProcessingResult = {
      engineId: processor.id,
      kind: 'identity',
      media: active.source,
      requestId: active.id,
      sourceUri: active.source.uri,
    };
    const forgedDerivative = {
      ...originalResult,
      kind: 'derivative' as const,
      media: { ...active.source, uri: 'file:///someone-elses-file.jpg' },
    };

    await processor.release(originalResult);
    await processor.release(forgedDerivative);

    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects a storage collision with Original without deleting Original', async () => {
    const { processor, storage, remove } = harness();
    const active = request('source-collision');
    storage.write = jest.fn(async () => active.source.uri);
    storage.owns = jest.fn(() => true);

    await expect(processor.process(active)).rejects.toThrow('owned derivative');

    expect(remove).not.toHaveBeenCalledWith(active.source.uri);
  });

  it('contains malformed image/render failures before any derivative is written', async () => {
    const renderer: SignatureStillImageRenderer = {
      render: jest.fn(async () => {
        throw new Error('decode failed');
      }),
    };
    const { processor, storage } = harness(renderer);

    await expect(processor.process(request('malformed'))).rejects.toThrow('decode failed');
    expect(storage.write).not.toHaveBeenCalled();
  });
});
