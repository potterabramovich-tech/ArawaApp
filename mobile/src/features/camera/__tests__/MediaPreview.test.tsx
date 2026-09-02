import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image, StyleSheet } from 'react-native';
import { MediaPreview } from '../MediaPreview';
import { PresetSelector } from '../effects/PresetSelector';
import { OriginalComparisonControl } from '../effects/OriginalComparisonControl';
import { PreviewEffectLayer } from '../effects/PreviewEffectLayer';
import type { ProcessingSessionState } from '../effects/processing/processingSession';

let mockProcessing: ProcessingSessionState;
const mockProcessingHook = jest.fn();
jest.mock('../effects/processing/useImageEffectProcessingSession', () => ({
  useImageEffectProcessingSession: (...args: unknown[]) => { mockProcessingHook(...args); return mockProcessing; },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));

const photo = { fileName: 'original.png', mimeType: 'image/png', uri: 'file:///original.png', source: 'camera' as const, saved: false };
const request = { id: 'current', source: photo, plan: { presetId: 'arawa-aura' as const, intensity: 58, operation: 'render-preset' as const } };
const ready: ProcessingSessionState = {
  status: 'ready', request, result: { kind: 'derivative', engineId: 'test', requestId: request.id, sourceUri: photo.uri,
    media: { fileName: 'look.png', mimeType: 'image/png', uri: 'file:///derivative.png' } },
};
let tree: ReactTestRenderer;
const props = { busyAction: null, canSave: true, insets: { top: 44, bottom: 34, left: 0, right: 0 }, photo,
  onRetake: jest.fn(), onSave: jest.fn(), onShare: jest.fn() };

beforeEach(() => { jest.clearAllMocks(); mockProcessing = { status: 'idle', sourceUri: photo.uri }; });
afterEach(async () => { await act(async () => tree?.unmount()); });
async function mount() { await act(async () => { tree = create(<MediaPreview {...props} />); }); }
async function selectAura() { await act(async () => { tree.root.findByType(PresetSelector).props.onPresetSelect('arawa-aura'); }); }

describe('rendered preview and Original controls', () => {
  it('compares Original without an overlay and never passes derivative media to Save/Share', async () => {
    await mount();
    mockProcessing = ready;
    await selectAura();
    expect(tree.root.findByType(Image).props.source.uri).toBe('file:///derivative.png');
    expect(tree.root.findAllByType(PreviewEffectLayer)).toHaveLength(0);
    const compare = tree.root.findAllByProps({ accessibilityLabel: 'Show untouched Original' })
      .find((node) => typeof node.props.onPress === 'function')!;
    const compareStyle = StyleSheet.flatten(typeof compare.props.style === 'function'
      ? compare.props.style({ pressed: false }) : compare.props.style);
    expect(compareStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(compare.props.accessibilityHint).toContain('Save and Share still use the untouched original');
    await act(async () => compare.props.onPress());
    expect(tree.root.findByType(Image).props.source.uri).toBe(photo.uri);
    expect(tree.root.findAllByType(PreviewEffectLayer)).toHaveLength(0);
    expect(tree.root.findByType(OriginalComparisonControl).props.showingOriginal).toBe(true);
    for (const label of ['Save', 'Share']) {
      await act(async () => tree.root.findAllByProps({ accessibilityLabel: label })
        .find((node) => typeof node.props.onPress === 'function')!.props.onPress());
    }
    expect(props.onSave).toHaveBeenCalledWith();
    expect(props.onShare).toHaveBeenCalledWith();
    expect(photo.uri).toBe('file:///original.png');
  });

  it('immediately hides an obsolete derivative at intensity zero, preset switch and reset', async () => {
    await mount(); mockProcessing = ready; await selectAura();
    await act(async () => tree.root.findByType(PresetSelector).props.onIntensityAdjust(-100));
    expect(tree.root.findByType(Image).props.source.uri).toBe(photo.uri);
    expect(tree.root.findAllByType(OriginalComparisonControl)).toHaveLength(0);
    await act(async () => tree.root.findByType(PresetSelector).props.onPresetSelect('nightglass'));
    expect(tree.root.findByType(Image).props.source.uri).toBe(photo.uri);
    expect(tree.root.findByType(Image).props.accessibilityLabel).toContain('overlay preview');
    await act(async () => tree.root.findByType(PresetSelector).props.onReset());
    expect(tree.root.findByType(PresetSelector).props.selection.intensity).toBe(0);
  });

  it('reselecting the failed preset explicitly requests a retry', async () => {
    await mount(); await selectAura();
    mockProcessing = { status: 'failure', request, error: { code: 'processing-failed', message: 'failed', recoverable: true } };
    await act(async () => tree.update(<MediaPreview {...props} />));
    const previousSelection = mockProcessingHook.mock.calls.at(-1)?.[1];
    await selectAura();
    const nextSelection = mockProcessingHook.mock.calls.at(-1)?.[1];
    expect(nextSelection).toEqual(previousSelection);
    expect(nextSelection).not.toBe(previousSelection);
  });

  it('resets comparison for a new derivative and rejects stale-source output', async () => {
    await mount(); mockProcessing = ready; await selectAura();
    await act(async () => tree.root.findByType(OriginalComparisonControl).props.onToggle());
    mockProcessing = { ...ready, result: { ...ready.result, media: { ...ready.result.media, uri: 'file:///new-look.png' } } };
    await act(async () => tree.update(<MediaPreview {...props} />));
    expect(tree.root.findByType(Image).props.source.uri).toBe('file:///new-look.png');
    mockProcessing = { ...ready, result: { ...ready.result, sourceUri: 'file:///different-source.png' } };
    await act(async () => tree.update(<MediaPreview {...props} />));
    expect(tree.root.findByType(Image).props.source.uri).toBe(photo.uri);
  });
});
