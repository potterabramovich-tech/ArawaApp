import {
  createCameraPhoto,
  getCameraShareMetadata,
  getRetainedPreviewPhoto,
  isShareCancellation,
  retainPreviewPhoto,
} from '../cameraMedia';

describe('camera media metadata', () => {
  it.each([
    ['photo.PNG', 'image/png', 'public.png'],
    ['photo.HEIC', 'image/heic', 'public.heic'],
    ['photo.jpeg', 'image/jpeg', 'public.jpeg'],
    ['photo.webp', 'image/webp', 'org.webmproject.webp'],
  ])('preserves %s metadata for native sharing', (fileName, mimeType, UTI) => {
    const photo = createCameraPhoto({
      fileName,
      mimeType,
      saved: true,
      source: 'library',
      uri: `file:///${fileName}`,
    });

    expect(photo).toMatchObject({ fileName, mimeType });
    expect(getCameraShareMetadata(photo)).toEqual({ mimeType, UTI });
  });

  it('infers captured media metadata from its URI without forcing gallery assets to JPEG', () => {
    const captured = createCameraPhoto({
      saved: false,
      source: 'camera',
      uri: 'file:///cache/arawa-moment.jpg?temporary=true',
    });
    const unknownGalleryImage = createCameraPhoto({
      fileName: 'provider-image',
      saved: true,
      source: 'library',
      uri: 'content://provider/42',
    });

    expect(captured).toMatchObject({ fileName: 'arawa-moment.jpg', mimeType: 'image/jpeg' });
    expect(getCameraShareMetadata(unknownGalleryImage)).toEqual({ mimeType: 'image/*' });
  });

  it('uses the picker MIME type as authoritative when a provider filename is misleading', () => {
    const photo = createCameraPhoto({
      fileName: 'provider-download.bin',
      mimeType: 'image/heic',
      saved: true,
      source: 'library',
      uri: 'content://provider/42',
    });

    expect(getCameraShareMetadata(photo)).toEqual({
      mimeType: 'image/heic',
      UTI: 'public.heic',
    });
  });
});

describe('camera media lifecycle and cancellation', () => {
  afterEach(() => retainPreviewPhoto(null));

  it.each([
    [{ name: 'AbortError' }],
    [{ code: 'ERR_USER_CANCELLED' }],
    [new Error('The share sheet was dismissed')],
  ])('recognizes a user share cancellation without creating an error', (error) => {
    expect(isShareCancellation(error)).toBe(true);
  });

  it('does not mistake an actual share failure for cancellation', () => {
    expect(isShareCancellation(new Error('Native share transport failed'))).toBe(false);
  });

  it('retains an unsaved local preview across an ordinary screen remount until retake', () => {
    const photo = createCameraPhoto({
      saved: false,
      source: 'camera',
      uri: 'file:///cache/retained.jpg',
    });

    retainPreviewPhoto(photo);
    expect(getRetainedPreviewPhoto()).toEqual(photo);

    retainPreviewPhoto(null);
    expect(getRetainedPreviewPhoto()).toBeNull();
  });
});
