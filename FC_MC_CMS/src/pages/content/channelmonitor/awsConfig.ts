import { MediaLiveClient } from '@aws-sdk/client-medialive';
import { MediaConnectClient } from '@aws-sdk/client-mediaconnect';

const medialiveClient = new MediaLiveClient({
  region: process.env.REACT_APP_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESSKEYID || '',
    secretAccessKey: process.env.REACT_APP_SECRETACCESSKEY || '',
  },
});

const mediaconnectClient = new MediaConnectClient({
  region: process.env.REACT_APP_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESSKEYID || '',
    secretAccessKey: process.env.REACT_APP_SECRETACCESSKEY || '',
  },
});

export {
  medialiveClient,
  mediaconnectClient,
};
