import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { CameraScreen } from '../CameraScreen';
import { MediaPreview } from '../MediaPreview';
import { retainPreviewPhoto } from '../cameraMedia';

const mockSave = jest.fn();
const mockPermission = jest.fn();
const mockShare = jest.fn();
const mockGetPermission = jest.fn();
const mockLibraryLoaded = jest.fn();
jest.mock('expo-media-library', () => {
  mockLibraryLoaded();
  return { Asset: { create: mockSave }, requestPermissionsAsync: mockPermission };
});
jest.mock('expo-camera', () => ({ CameraView: 'Camera', useCameraPermissions: () => [null, jest.fn(), mockGetPermission] }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined), notificationAsync: jest.fn().mockResolvedValue(undefined), NotificationFeedbackType: { Success: 'success', Error: 'error' } }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn().mockResolvedValue(true), shareAsync: (...args: unknown[]) => mockShare(...args) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/components/Screen', () => ({ Screen: 'Screen' }));
jest.mock('@/components/GlowButton', () => ({ GlowButton: 'Button' }));
jest.mock('../CameraControls', () => ({ CameraControls: 'CameraControls' }));
jest.mock('../CameraFailureBanner', () => ({ CameraFailureBanner: 'Failure' }));
jest.mock('../MediaPreview', () => ({ MediaPreview: 'MediaPreview' }));

const photo = { fileName: 'original.heic', mimeType: 'image/heic', uri: 'file:///original.heic', source: 'camera' as const, saved: false };
let tree: ReactTestRenderer;
let appChanged: (state: AppStateStatus) => void;
const initialPlatform = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  mockSave.mockResolvedValue(undefined);
  mockShare.mockResolvedValue(undefined);
  mockPermission.mockResolvedValue({ granted: true });
  mockGetPermission.mockResolvedValue({ granted: true });
  retainPreviewPhoto({ ...photo });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    appChanged = callback; return { remove: jest.fn() };
  });
});
afterEach(async () => {
  await act(async () => tree?.unmount()); retainPreviewPhoto(null);
  Platform.OS = initialPlatform; jest.restoreAllMocks();
});
async function mount() { await act(async () => { tree = create(<CameraScreen />); }); }

describe('native Original save/share boundary', () => {
  it('does not evaluate the native media library during web startup or disabled web Save', async () => {
    Platform.OS = 'web'; await mount();
    await act(async () => tree.root.findByType(MediaPreview).props.onSave());
    expect(mockLibraryLoaded).not.toHaveBeenCalled();
    expect(mockPermission).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves Original once with add-only photo permission and shares its original MIME', async () => {
    await mount();
    const onSave = tree.root.findByType(MediaPreview).props.onSave;
    await act(async () => { await Promise.all([onSave(), onSave()]); });
    expect(mockPermission).toHaveBeenCalledWith(true, ['photo']);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(photo.uri);
    await act(async () => tree.root.findByType(MediaPreview).props.onShare());
    expect(mockShare).toHaveBeenCalledWith(photo.uri, expect.objectContaining({ mimeType: photo.mimeType, UTI: 'public.heic' }));
  });

  it('never writes media after permission denial and preserves preview on refresh rejection', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    await mount();
    await act(async () => tree.root.findByType(MediaPreview).props.onSave());
    expect(mockSave).not.toHaveBeenCalled();
    mockGetPermission.mockRejectedValueOnce(new Error('permission refresh unavailable'));
    await act(async () => appChanged('active'));
    expect(tree.root.findByType(MediaPreview).props.photo.uri).toBe(photo.uri);
  });
});
