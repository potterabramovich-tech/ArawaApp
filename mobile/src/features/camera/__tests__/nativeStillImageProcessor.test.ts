import type { ImageEffectProcessor, ImageProcessingRequest } from '../effects/processing/types';

const mockFiles = new Map<string, Uint8Array>();
const mockDelete = jest.fn();
const mockWrite = jest.fn();
const mockRead = jest.fn();
const mockDispose = {
  data: jest.fn(), image: jest.fn(), surface: jest.fn(), snapshot: jest.fn(),
  paint: jest.fn(), filter: jest.fn(),
};
const mockCanvas = { clear: jest.fn(), drawImageRectOptions: jest.fn() };
const mockEncode = jest.fn();
const mockDecode = jest.fn();
const mockMakeSurface = jest.fn();
let mockMissingNative = false;
const root = 'file:///cache/aracam/rendered-preview-v1/';

jest.mock('expo-file-system', () => {
  const uriOf = (value: string | { uri: string }) => typeof value === 'string' ? value : value.uri;
  const join = (parts: (string | { uri: string })[]) => parts.map(uriOf)
    .map((part, index) => index === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')).join('/');
  return {
    Paths: { cache: { uri: 'file:///cache' } },
    Directory: class {
      uri: string;
      constructor(...parts: (string | { uri: string })[]) { this.uri = join(parts); }
      create() {}
    },
    File: class {
      uri: string;
      constructor(...parts: (string | { uri: string })[]) { this.uri = join(parts); }
      get exists() { return mockFiles.has(this.uri); }
      async bytes() { return mockRead(this.uri); }
      create() {
        if (this.exists) throw new Error('file already exists');
        mockFiles.set(this.uri, new Uint8Array());
      }
      write(bytes: Uint8Array) { mockWrite(this.uri); mockFiles.set(this.uri, bytes); }
      delete() { mockDelete(this.uri); mockFiles.delete(this.uri); }
    },
  };
});

jest.mock('@shopify/react-native-skia', () => {
  if (mockMissingNative) throw new Error('Skia native runtime is unavailable');
  return {
    FilterMode: { Linear: 1 }, MipmapMode: { Linear: 1 }, ImageFormat: { PNG: 1, JPEG: 2 },
    Skia: {
      Data: { fromBytes: () => ({ dispose: mockDispose.data }) },
      Image: { MakeImageFromEncoded: mockDecode },
      Surface: { MakeOffscreen: mockMakeSurface },
      Paint: () => ({ setColorFilter: jest.fn(), setAntiAlias: jest.fn(), setDither: jest.fn(), dispose: mockDispose.paint }),
      ColorFilter: { MakeMatrix: () => ({ dispose: mockDispose.filter }) },
      Color: (color: string) => color,
      XYWHRect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
    },
  };
});

function loadProcessor(): ImageEffectProcessor | null {
  let processor: ImageEffectProcessor | null = null;
  jest.isolateModules(() => {
    processor = jest.requireActual('../effects/processing/engines/platformStillImageProcessor.native').platformStillImageProcessor;
  });
  return processor;
}

function request(id = 'native'): ImageProcessingRequest {
  return {
    id, source: { fileName: 'original.png', mimeType: 'image/png', uri: 'file:///original.png' },
    plan: { presetId: 'arawa-aura', intensity: 100, operation: 'render-preset' },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMissingNative = false;
  mockFiles.clear();
  mockFiles.set('file:///original.png', new Uint8Array([7, 8, 9]));
  mockRead.mockImplementation(async (uri: string) => mockFiles.get(uri));
  mockWrite.mockImplementation(() => undefined);
  mockDelete.mockImplementation(() => undefined);
  mockDecode.mockReturnValue({ width: () => 4032, height: () => 3024, dispose: mockDispose.image });
  mockEncode.mockReturnValue(new Uint8Array([1, 2, 3]));
  mockMakeSurface.mockReturnValue({
    getCanvas: () => mockCanvas, flush: jest.fn(), dispose: mockDispose.surface,
    makeImageSnapshot: () => ({ encodeToBytes: mockEncode, dispose: mockDispose.snapshot }),
  });
});

describe('native rendering adapter without device hardware', () => {
  it('does not delete or overwrite an existing cache file on a filename collision', async () => {
    const processor = loadProcessor()!;
    const first = await processor.process(request());
    const before = mockFiles.get(first.media.uri);
    await expect(processor.process(request())).rejects.toThrow('already exists');
    expect(mockFiles.get(first.media.uri)).toBe(before);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('refuses cleanup ownership of unrelated files inside the cache directory', async () => {
    const processor = loadProcessor()!;
    const result = await processor.process(request());
    const unrelated = `${root}unowned.png`;
    mockFiles.set(unrelated, new Uint8Array([9]));
    await processor.release({ ...result, media: { ...result.media, uri: unrelated } });
    expect(mockFiles.has(unrelated)).toBe(true);
    expect(mockDelete).not.toHaveBeenCalledWith(unrelated);
  });

  it('preserves the source bytes and disposes every acquired Skia resource', async () => {
    const processor = loadProcessor()!;
    const original = mockFiles.get('file:///original.png');
    const result = await processor.process(request());
    expect(result.media.mimeType).toBe('image/png');
    expect(mockCanvas.clear).toHaveBeenCalledWith('transparent');
    expect(mockMakeSurface).toHaveBeenCalledWith(2048, 1536);
    expect(mockEncode).toHaveBeenCalledWith(1, 100);
    Object.values(mockDispose).forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    await processor.release(result);
    expect(mockFiles.get('file:///original.png')).toBe(original);
    expect(mockDelete).not.toHaveBeenCalledWith('file:///original.png');
  });

  it('keeps failed partial-file cleanup retryable without sweeping unrelated files', async () => {
    const processor = loadProcessor()!;
    const unrelated = `${root}retained.png`;
    mockFiles.set(unrelated, new Uint8Array([5]));
    mockWrite.mockImplementationOnce(() => { throw new Error('no space'); });
    mockDelete.mockImplementationOnce(() => { throw new Error('file busy'); });
    await expect(processor.process(request('partial'))).rejects.toThrow('no space');
    const partial = [...mockFiles.keys()].find((uri) => uri.includes('partial'))!;
    expect(mockFiles.has(partial)).toBe(true);
    await processor.process(request('retry'));
    expect(mockFiles.has(partial)).toBe(false);
    expect(mockFiles.has(unrelated)).toBe(true);
  });

  it.each(['decode', 'surface', 'encode'] as const)('contains %s failure and disposes acquired resources', async (stage) => {
    const processor = loadProcessor()!;
    if (stage === 'decode') mockDecode.mockReturnValue(null);
    if (stage === 'surface') mockMakeSurface.mockReturnValue(null);
    if (stage === 'encode') mockEncode.mockReturnValue(new Uint8Array());
    await expect(processor.process(request(stage))).rejects.toThrow();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockDispose.data).toHaveBeenCalledTimes(1);
    if (stage !== 'decode') expect(mockDispose.image).toHaveBeenCalledTimes(1);
    if (stage === 'encode') Object.values(mockDispose).forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
  });

  it('cancels after source reading without decoding or writing a derivative', async () => {
    const processor = loadProcessor()!;
    let finishRead!: (bytes: Uint8Array) => void;
    mockRead.mockReturnValue(new Promise<Uint8Array>((resolve) => { finishRead = resolve; }));
    const job = processor.process(request('cancel'));
    processor.cancel?.('cancel');
    finishRead(new Uint8Array([1]));
    await expect(job).rejects.toThrow('cancelled');
    expect(mockDecode).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('keeps cancellation cleanup failures retryable on the next render', async () => {
    const processor = loadProcessor()!;
    mockWrite.mockImplementationOnce(() => processor.cancel?.('cancel-write'));
    mockDelete.mockImplementationOnce(() => { throw new Error('busy'); });
    await expect(processor.process(request('cancel-write'))).rejects.toThrow('cancelled');
    const abandoned = [...mockFiles.keys()].find((uri) => uri.includes('cancel-write'))!;
    await processor.process(request('next'));
    expect(mockFiles.has(abandoned)).toBe(false);
  });

  it('degrades to no processor when the native runtime cannot initialize', () => {
    mockMissingNative = true;
    expect(loadProcessor()).toBeNull();
  });
});
