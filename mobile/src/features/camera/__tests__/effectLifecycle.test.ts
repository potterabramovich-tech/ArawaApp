import { cameraSessionReducer, type CameraPhoto } from '../cameraSession';
import {
  createImageEffectSelectionState,
  imageEffectSelectionReducer,
} from '../effects/effectSelection';

const originalPhoto: CameraPhoto = {
  fileName: 'untouched.jpg',
  mimeType: 'image/jpeg',
  saved: false,
  source: 'camera',
  uri: 'file:///untouched.jpg',
};

describe('effects and camera preview lifecycle', () => {
  it('keeps the captured CameraPhoto untouched while selecting and resetting a look', () => {
    const preview = cameraSessionReducer(
      { status: 'capturing' },
      { type: 'capture-succeeded', photo: originalPhoto },
    );
    const selected = imageEffectSelectionReducer(
      createImageEffectSelectionState(originalPhoto.uri),
      { type: 'preset-selected', presetId: 'arawa-aura' },
    );
    const reset = imageEffectSelectionReducer(selected, { type: 'reset' });

    expect(preview).toEqual({ status: 'preview-ready', photo: originalPhoto });
    expect(selected.sourceUri).toBe(originalPhoto.uri);
    expect(reset.sourceUri).toBe(originalPhoto.uri);
    expect(originalPhoto).toEqual({
      fileName: 'untouched.jpg',
      mimeType: 'image/jpeg',
      saved: false,
      source: 'camera',
      uri: 'file:///untouched.jpg',
    });
  });

  it('keeps save and share lifecycle transitions bound to the original URI', () => {
    const preview = { status: 'preview-ready', photo: originalPhoto } as const;
    const saving = cameraSessionReducer(preview, { type: 'save-started' });
    const sharing = cameraSessionReducer(preview, { type: 'share-started' });

    expect(saving).toMatchObject({ photo: { uri: originalPhoto.uri } });
    expect(sharing).toMatchObject({ photo: { uri: originalPhoto.uri } });
  });
});
