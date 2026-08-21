import { ProcessingOutputStore } from '../effects/processing/outputStore';
import type { ImageProcessingResult } from '../effects/processing/types';

function result(
  kind: ImageProcessingResult['kind'],
  uri: string,
  sourceUri = 'file:///original.jpg',
): ImageProcessingResult {
  return {
    engineId: 'test',
    kind,
    media: { fileName: 'media.jpg', mimeType: 'image/jpeg', uri },
    requestId: 'request',
    sourceUri,
  };
}

describe('processing output ownership', () => {
  it('never takes ownership of Original or a derivative aliasing its source', () => {
    const store = new ProcessingOutputStore();
    const remover = { remove: jest.fn() };

    expect(store.register(result('identity', 'file:///original.jpg'), remover)).toBe(false);
    expect(store.register(result('derivative', 'file:///original.jpg'), remover)).toBe(false);
    expect(store.owns('file:///original.jpg')).toBe(false);
  });

  it('removes only explicitly registered derivative files', async () => {
    const store = new ProcessingOutputStore();
    const remover = { remove: jest.fn().mockResolvedValue(undefined) };
    store.register(result('derivative', 'file:///temporary-look.jpg'), remover);

    await expect(store.release('file:///original.jpg')).resolves.toBe(false);
    await expect(store.release('file:///temporary-look.jpg')).resolves.toBe(true);
    expect(remover.remove).toHaveBeenCalledWith('file:///temporary-look.jpg');
  });

  it('restores ownership after a failed cleanup so it can be retried', async () => {
    const store = new ProcessingOutputStore();
    const remover = {
      remove: jest
        .fn()
        .mockRejectedValueOnce(new Error('busy'))
        .mockResolvedValueOnce(undefined),
    };
    const uri = 'file:///temporary-look.jpg';
    store.register(result('derivative', uri), remover);

    await expect(store.release(uri)).rejects.toThrow('busy');
    expect(store.owns(uri)).toBe(true);
    await expect(store.release(uri)).resolves.toBe(true);
    expect(store.owns(uri)).toBe(false);
  });

  it('reference-counts shared derivative URIs before deleting them', async () => {
    const store = new ProcessingOutputStore();
    const remover = { remove: jest.fn().mockResolvedValue(undefined) };
    const shared = result('derivative', 'file:///shared-look.jpg');
    store.register(shared, remover);
    store.register(shared, remover);

    expect(store.referenceCount(shared.media.uri)).toBe(2);
    await expect(store.release(shared.media.uri)).resolves.toBe(false);
    expect(remover.remove).not.toHaveBeenCalled();
    await expect(store.release(shared.media.uri)).resolves.toBe(true);
    expect(remover.remove).toHaveBeenCalledTimes(1);
  });


  it('does not retry or remove an actively owned derivative', async () => {
    const store = new ProcessingOutputStore();
    const remover = { remove: jest.fn().mockResolvedValue(undefined) };
    const active = result('derivative', 'file:///active-look.jpg');
    store.register(active, remover);

    await store.retryFailed();

    expect(remover.remove).not.toHaveBeenCalled();
    expect(store.owns(active.media.uri)).toBe(true);
  });
  it('attempts every owned cleanup even when one deletion fails', async () => {
    const store = new ProcessingOutputStore();
    const first = {
      remove: jest.fn().mockRejectedValue(new Error('busy')),
    };
    const second = { remove: jest.fn().mockResolvedValue(undefined) };
    store.register(result('derivative', 'file:///one-render.jpg'), first);
    store.register(result('derivative', 'file:///two-render.jpg'), second);

    await expect(store.releaseAll()).rejects.toThrow('busy');

    expect(first.remove).toHaveBeenCalled();
    expect(second.remove).toHaveBeenCalled();
    expect(store.owns('file:///one-render.jpg')).toBe(true);
    expect(store.owns('file:///two-render.jpg')).toBe(false);
  });
});
