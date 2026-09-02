import appConfig from '../../../../app.json';

describe('AraCam native permission configuration', () => {
  it('requests camera access without unused microphone permission', () => {
    const plugin = appConfig.expo.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-camera',
    );

    expect(plugin).toEqual([
      'expo-camera',
      expect.objectContaining({
        cameraPermission: expect.stringContaining('camera'),
        microphonePermission: false,
        recordAudioAndroid: false,
      }),
    ]);
  });
});
