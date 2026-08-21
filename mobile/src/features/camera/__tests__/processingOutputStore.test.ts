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
    store.register(result('identity', 'file:///original.jpg'));
    store.register(result('derivative', 'file:///original.jpg'));

    expect(store.owns('file:///original.jpg')).toBe(false);
  });

  it('removes only explicitly registered derivative files', async () => {
    const store = new ProcessingOutputStore();
    const remover = { remove: jest.fn().mockResolvedValue(undefined) };
    store.register(result('derivative', 'file:///temporary-look.jpg'));

    await expect(store.release('file:///original.jpg', remover)).resolves.toBe(false);
    await expect(store.release('file:///temporary-look.jpg', remover)).resolves.toBe(true);
    expect(remover.remove).toHaveBeenCalledTimes(1);
    expect(remover.remove).toHaveBeenCalledWith('file:///temporary-look.jpg');
  });

  it('restores ownership after a failed cleanup so it can be retried', async () => {
    const store = new ProcessingOutputStore();
    const remover = { remove: jest.fn().mockRejectedValue(new Error('busy')) };
    const uri = 'file:///temporary-look.jpg';
    store.register(result('derivative', uri));

    await expect(store.release(uri, remover)).rejects.toThrow('busy');
    expect(store.owns(uri)).toBe(true);
  });

  it('releases every owned derivative without touching the original', async () => {
    const store = new ProcessingOutputStore();
    const remover = { remove: jest.fn().mockResolvedValue(undefined) };
    store.register(result('derivative', 'file:///one-render.jpg'));
    store.register(result('derivative', 'file:///two-render.jpg'));
    store.register(result('identity', 'file:///original.jpg'));

    await store.releaseAll(remover);

    expect(remover.remove.mock.calls.flat()).toEqual([
      'file:///one-render.jpg',
      'file:///two-render.jpg',
    ]);
    expect(store.owns('file:///one-render.jpg')).toBe(false);
  });
});
