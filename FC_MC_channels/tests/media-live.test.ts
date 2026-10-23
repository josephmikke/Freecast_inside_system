import audioDescription from '../broadcast/encoder-settings/audio-descriptions';
import videoDescriptions from '../broadcast/encoder-settings/video-descriptions';
import outputs from '../broadcast/encoder-settings/outputs';

describe('Encoder Settings outputs', () => {
  it('should have a video description', () => {
    outputs.forEach(({ VideoDescriptionName }) => {
      expect(videoDescriptions.some((video) => video.Name === VideoDescriptionName)).toBe(true);
    });
  });

  it('should have a audio description', () => {
    outputs.forEach(({ AudioDescriptionNames: [AudioDescriptionName] }) => {
      expect(audioDescription.some((audio) => audio.Name === AudioDescriptionName)).toBe(true);
    });
  });
});
