import type {
  SkImage,
  SkColorFilter,
  SkPaint,
  SkSurface,
} from '@shopify/react-native-skia';
import type { ImageEffectProcessor } from '../types';
import { calculatePreviewSize } from '../derivativePaths';
import {
  createSignatureStillImageProcessor,
  type PreviewDerivativeStorage,
  type SignatureStillImageRenderer,
} from '../stillImageProcessor';

function createNativeProcessor(): ImageEffectProcessor {
  // Keep runtime initialization inside the guarded native factory. Web never imports this module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Static imports would throw before the capability fallback can run.
  const { Directory, File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const { FilterMode, ImageFormat, MipmapMode, Skia } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro needs a literal synchronous require at this guarded native boundary.
    require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia');
  const derivativeDirectory = new Directory(Paths.cache, 'aracam', 'rendered-preview-v1');
  const derivativeRootUri = derivativeDirectory.uri.endsWith('/')
    ? derivativeDirectory.uri
    : `${derivativeDirectory.uri}/`;

  const ownedFiles = new Set<string>();
  const failedCleanup = new Set<string>();

  function removeOwnedFile(uri: string): void {
    if (!ownedFiles.has(uri)) return;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
      ownedFiles.delete(uri);
      failedCleanup.delete(uri);
    } catch (error) {
      failedCleanup.add(uri);
      throw error;
    }
  }

  const storage: PreviewDerivativeStorage = {
    async write(fileName, bytes, sourceUri) {
      // Only retry files explicitly created by this runtime. Never sweep shared cache contents.
      for (const uri of failedCleanup) {
        if (uri === sourceUri) continue;
        try { removeOwnedFile(uri); } catch { /* Keep ownership for the next retry. */ }
      }
      if (/[\\/]/.test(fileName) || fileName.includes('..')) {
        throw new Error('Invalid derivative filename.');
      }
      derivativeDirectory.create({ idempotent: true, intermediates: true });
      const file = new File(derivativeDirectory, fileName);
      if (file.uri === new File(sourceUri).uri || !file.uri.startsWith(derivativeRootUri)) {
        throw new Error('A derivative cannot replace its source.');
      }
      // A failed exclusive create must never give us cleanup ownership of an existing file.
      file.create({ overwrite: false });
      ownedFiles.add(file.uri);
      try {
        file.write(bytes);
        return file.uri;
      } catch (error) {
        try { removeOwnedFile(file.uri); } catch { /* Preserve the write error and retry cleanup later. */ }
        throw error;
      }
    },
    owns(uri) {
      return ownedFiles.has(uri);
    },
    async remove(uri) {
      removeOwnedFile(uri);
    },
  };

  const renderer: SignatureStillImageRenderer = {
    async render(request, recipe, format, isCancelled) {
      let sourceImage: SkImage | null = null;
      let surface: SkSurface | null = null;
      let snapshot: SkImage | null = null;
      let paint: SkPaint | null = null;
      let colorFilter: SkColorFilter | null = null;
      try {
        const bytes = await new File(request.source.uri).bytes();
        ensureActive(isCancelled);
        const data = Skia.Data.fromBytes(bytes);
        try {
          sourceImage = Skia.Image.MakeImageFromEncoded(data);
        } finally {
          data.dispose();
        }
        if (!sourceImage) {
          throw new Error('The selected image format could not be decoded locally.');
        }

        const size = calculatePreviewSize(sourceImage.width(), sourceImage.height());
        surface = Skia.Surface.MakeOffscreen(size.width, size.height);
        if (!surface) {
          throw new Error('A local image rendering surface could not be created.');
        }

        paint = Skia.Paint();
        colorFilter = Skia.ColorFilter.MakeMatrix([...recipe.colorMatrix]);
        paint.setColorFilter(colorFilter);
        paint.setAntiAlias(true);
        paint.setDither(true);
        const canvas = surface.getCanvas();
        canvas.clear(Skia.Color('transparent'));
        canvas.drawImageRectOptions(
          sourceImage,
          Skia.XYWHRect(0, 0, sourceImage.width(), sourceImage.height()),
          Skia.XYWHRect(0, 0, size.width, size.height),
          FilterMode.Linear,
          MipmapMode.Linear,
          paint,
        );
        surface.flush();
        ensureActive(isCancelled);
        snapshot = surface.makeImageSnapshot();
        const encoded = snapshot.encodeToBytes(
          format === 'png' ? ImageFormat.PNG : ImageFormat.JPEG,
          format === 'png' ? 100 : 94,
        );
        if (encoded.length === 0) {
          throw new Error('The rendered preview could not be encoded.');
        }
        ensureActive(isCancelled);
        return { bytes: encoded };
      } finally {
        colorFilter?.dispose();
        paint?.dispose();
        snapshot?.dispose();
        surface?.dispose();
        sourceImage?.dispose();
      }
    },
  };

  return createSignatureStillImageProcessor(renderer, storage);
}

export const platformStillImageProcessor: ImageEffectProcessor | null = (() => {
  try {
    return createNativeProcessor();
  } catch {
    // Missing native modules must leave Original/camera and the honest overlay fallback usable.
    return null;
  }
})();

function ensureActive(isCancelled: () => boolean): void {
  if (isCancelled()) {
    throw new Error('Image processing was cancelled.');
  }
}
