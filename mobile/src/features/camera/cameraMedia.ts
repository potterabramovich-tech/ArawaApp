import type { CameraPhoto } from './cameraSession';

interface MediaDescriptor {
  fileName?: string | null;
  mimeType?: string | null;
  saved: boolean;
  source: CameraPhoto['source'];
  uri: string;
}

export interface CameraShareMetadata {
  mimeType: string;
  UTI?: string;
}

const mediaTypesByExtension: Record<string, { mimeType: string; UTI?: string }> = {
  gif: { mimeType: 'image/gif', UTI: 'com.compuserve.gif' },
  heic: { mimeType: 'image/heic', UTI: 'public.heic' },
  heif: { mimeType: 'image/heif', UTI: 'public.heif' },
  jpeg: { mimeType: 'image/jpeg', UTI: 'public.jpeg' },
  jpg: { mimeType: 'image/jpeg', UTI: 'public.jpeg' },
  png: { mimeType: 'image/png', UTI: 'public.png' },
  webp: { mimeType: 'image/webp', UTI: 'org.webmproject.webp' },
};

const UTIByMimeType = Object.values(mediaTypesByExtension).reduce<Record<string, string>>(
  (types, mediaType) => {
    if (mediaType.UTI) {
      types[mediaType.mimeType] = mediaType.UTI;
    }
    return types;
  },
  {},
);

let retainedPreview: CameraPhoto | null = null;

export function createCameraPhoto({
  fileName,
  mimeType,
  saved,
  source,
  uri,
}: MediaDescriptor): CameraPhoto {
  const normalizedFileName = fileName?.trim() || fileNameFromUri(uri) || `arawa-moment.${source === 'camera' ? 'jpg' : 'image'}`;
  const extension = extensionFromFileName(normalizedFileName);

  return {
    fileName: normalizedFileName,
    mimeType: mimeType?.trim().toLowerCase() || mediaTypesByExtension[extension]?.mimeType || 'image/*',
    saved,
    source,
    uri,
  };
}

export function getCameraShareMetadata(photo: CameraPhoto): CameraShareMetadata {
  const extension = extensionFromFileName(photo.fileName);
  const knownType = mediaTypesByExtension[extension];
  const metadata: CameraShareMetadata = { mimeType: photo.mimeType || knownType?.mimeType || 'image/*' };

  const UTI = UTIByMimeType[metadata.mimeType] ?? knownType?.UTI;
  if (UTI) {
    metadata.UTI = UTI;
  }

  return metadata;
}

export function isShareCancellation(error: unknown): boolean {
  const code = readErrorValue(error, 'code').toLowerCase();
  const name = readErrorValue(error, 'name').toLowerCase();
  const message = readErrorValue(error, 'message').toLowerCase();
  const searchable = `${code} ${name} ${message}`;

  return (
    name === 'aborterror' ||
    searchable.includes('user_cancel') ||
    searchable.includes('user cancel') ||
    searchable.includes('cancelled') ||
    searchable.includes('canceled') ||
    searchable.includes('dismissed')
  );
}

export function retainPreviewPhoto(photo: CameraPhoto | null): void {
  retainedPreview = photo;
}

export function getRetainedPreviewPhoto(): CameraPhoto | null {
  return retainedPreview;
}

function fileNameFromUri(uri: string): string | null {
  const withoutQuery = uri.split(/[?#]/, 1)[0];
  const encodedName = withoutQuery?.split('/').pop();

  if (!encodedName) {
    return null;
  }

  try {
    return decodeURIComponent(encodedName);
  } catch {
    return encodedName;
  }
}

function extensionFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop();
  return extension && extension !== fileName ? extension.toLowerCase() : '';
}

function readErrorValue(error: unknown, key: 'code' | 'message' | 'name'): string {
  if (typeof error !== 'object' || error === null || !(key in error)) {
    return '';
  }

  const value = error[key as keyof typeof error];
  return typeof value === 'string' ? value : '';
}
