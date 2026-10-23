import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { mockClient } from 'aws-sdk-client-mock';

import RecorderAdaptor from '../RecorderAdaptor';
import { RecorderError } from '../RecorderError';

const mpMock = mockClient(MediaPackageClient);

describe('Recorder Adaptor', () => {
  afterEach(() => {
    mpMock.reset();
  });

  describe('Error', () => {
    it('should throw a recording error', async () => {
      // Arrange
      mpMock.rejects({});
      const mpClient = new MediaPackageClient({});
      const recorderAdaptor = new RecorderAdaptor(mpClient);

      // Act and Assert
      await expect(async () => recorderAdaptor.startRecording({
        id: '',
        channel: 'vubiquity_Value_Reelz',
        startTime: '',
        endTime: '',
        destination: {
          ManifestKey: 'npvr/johndoe/index.m3u8',
          BucketName: 'test-npvr',
          RoleArn: 'arn:iam:XXXXX',
        },
      })).rejects.toThrow(RecorderError.UnableToStartRecording);
    });

    it('should return false', async () => {
      // Arrange
      const mpClient = new MediaPackageClient({});
      const recorderAdaptor = new RecorderAdaptor(mpClient);

      // Act
      const result = await recorderAdaptor.startRecording({
        id: '',
        channel: 'vubiquity_Value_Reelz',
        startTime: '',
        endTime: '',
        destination: {
          ManifestKey: 'npvr/johndoe/index.m3u8',
          BucketName: 'test-npvr',
          RoleArn: 'arn:iam:XXXXX',
        },
      });

      // Assert
      expect(result).toBeFalsy();
    });
  });

  describe('Success', () => {
    it('should return true', async () => {
      // Arrange
      mpMock.resolves({});
      const mpClient = new MediaPackageClient({});
      const recorderAdaptor = new RecorderAdaptor(mpClient);

      // Act
      const result = await recorderAdaptor.startRecording({
        id: '',
        channel: 'vubiquity_Value_Reelz',
        startTime: '',
        endTime: '',
        destination: {
          ManifestKey: 'npvr/johndoe/index.m3u8',
          BucketName: 'test-npvr',
          RoleArn: 'arn:iam:XXXXX',
        },
      });

      // Assert
      expect(result).toBeTruthy();
    });
  });
});
