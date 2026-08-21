import { Directory, File, Paths } from 'expo-file-system';
import {
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  type SkImage,
  type SkColorFilter,
  type SkPaint,
  type SkSurface,
} from '@shopify/react-native-skia';
import { calculatePreviewSize } from '../derivativePaths';
import {
  createSignatureStillImageProcessor,
  type PreviewDerivativeStorage,
  type SignatureStillImageRenderer,
} from '../stillImageProcessor';

const derivativeDirectory = new Directory(Paths.cache, 'aracam', 'rendered-preview-v1');
const derivativeRootUri = derivativeDirectory.uri.endsWith('/')
  ? derivativeDirectory.uri
  : `${derivativeDirectory.uri}/`;

const storage: PreviewDerivativeStorage = {
  async write(fileName, bytes) {
    derivativeDirectory.create({ idempotent: true, intermediates: true });
    const file = new File(derivativeDirectory, fileName);
    try {
      file.create({ overwrite: false });
      file.write(bytes);
      return file.uri;
    } catch (error) {
      if (file.exists) {
        file.delete();
      }
      throw error;
    }
  },
  owns(uri) {
    return uri.startsWith(derivativeRootUri);
  },
  async remove(uri) {
    if (!uri.startsWith(derivativeRootUri)) {
      return;
    }
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
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

export const platformStillImageProcessor = createSignatureStillImageProcessor(renderer, storage);

function ensureActive(isCancelled: () => boolean): void {
  if (isCancelled()) {
    throw new Error('Image processing was cancelled.');
  }
}
