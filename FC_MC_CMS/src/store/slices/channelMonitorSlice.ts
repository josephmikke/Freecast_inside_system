// eslint-disable-next-line import/no-extraneous-dependencies
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Channel, ChannelAlarms } from '@/domain/entities/content/channelMonitor';
import { fetchAlarm, getChannelInfo } from '@/api/channelMonitor';

interface ChannelMonitorState {
  channels: Channel[];
  alarms: ChannelAlarms[] | [];
  loading: boolean;
  error: string | null;
}

const initialState: ChannelMonitorState = {
  channels: [
    {
      flows: [
        { flowName: 'nextologies_Sports_HD_backup', flowARN: 'nextologies_Sports_HD_backup', flowConnected: false },
        { flowName: 'vubiquity_Value_Sportsman_Channel_HD', flowARN: 'vubiquity_Value_Sportsman_Channel_HD', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_Sportsman_Channel_HD - clone',
      id: 0,
      name: 'Sports',
      streamUrl: 'https://d3drnpkv3sqobz.cloudfront.net/93d72030792142cd91afcbf28458e7dd/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'nextologies_Outdoor_backup', flowARN: 'nextologies_Outdoor_backup', flowConnected: false },
        { flowName: 'vubiquity_Value_Outdoor_Channel_HD', flowARN: 'vubiquity_Value_Outdoor_Channel_HD', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_Outdoor_Channel_HD - clone',
      id: 1,
      name: 'Outdoor',
      streamUrl: 'https://d2bdj57e36jme2.cloudfront.net/a92327e45cbe4dc682ba27ac1bc09130/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_World_Fishing_Network', flowARN: 'vubiquity_Value_World_Fishing_Network', flowConnected: false },
        { flowName: 'nextologies_Value_WFN', flowARN: 'nextologies_Value_WFN', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_World_Fishing_Network - clone',
      id: 2,
      name: 'WFN',
      streamUrl: 'https://d1usqf0c34ux16.cloudfront.net/6353365d5bfd4a11820d9819f770647e/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'amagi_Value_curiosity', flowARN: 'amagi_Value_curiosity', flowConnected: false },
      ],
      channel_name: 'amagi_Value_curiosity',
      id: 3,
      name: 'Curiosity',
      streamUrl: 'https://d1usqf0c34ux16.cloudfront.net/d2f2e22cf282462b816e784ebedbd3ad/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'Pursuit-Mediaconnect', flowARN: 'Pursuit-Mediaconnect', flowConnected: false },
      ],
      channel_name: 'pursuit_Value_Pursuit',
      id: 4,
      name: 'Pursuit',
      streamUrl: 'https://d1usqf0c34ux16.cloudfront.net/16de4e89edb4454eabaf39570f101a7a/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'nextologies_Value_AXS_TV', flowARN: 'nextologies_Value_AXS_TV', flowConnected: false },
        { flowName: 'vubiquity_Value_AXS_TV', flowARN: 'vubiquity_Value_AXS_TV', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_AXS_TV - clone',
      id: 5,
      name: 'AXS_TV',
      streamUrl: 'https://d3drnpkv3sqobz.cloudfront.net/85f8c0ac47504a919cf69a2034c6f5f7/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'nextologies_babyfirst_tv', flowARN: 'nextologies_babyfirst_tv', flowConnected: false },
      ],
      channel_name: 'babyfirst_tv',
      id: 6,
      name: 'BabyFirst',
      streamUrl: 'https://dvfni66g5a7g9.cloudfront.net/8623ba93995248318318c4b7021fca9a/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_Family_Movie_Classics', flowARN: 'vubiquity_Value_Family_Movie_Classics', flowConnected: false },
        { flowName: 'vubiquity_Value_Family_Movie_Classics_backup', flowARN: 'vubiquity_Value_Family_Movie_Classics_backup', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_Family_Movie_Classics',
      id: 7,
      name: 'FMC',
      streamUrl: 'https://d3drnpkv3sqobz.cloudfront.net/646a956cb5994bfcbd075e0810fd716c/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_FETV', flowARN: 'vubiquity_Value_FETV', flowConnected: false },
        { flowName: 'vubiquity_Value_FETV_Backup', flowARN: 'vubiquity_Value_FETV_Backup', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_FETV - clone',
      id: 8,
      name: 'FETV',
      streamUrl: 'https://dvfni66g5a7g9.cloudfront.net/94c2ea5dde2b40cdb07fac672bff1ca5/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_Get_TV', flowARN: 'vubiquity_Value_Get_TV', flowConnected: false },
        { flowName: 'nextologies_GET_TV_backup', flowARN: 'nextologies_GET_TV_backup', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_Get_TV - clone',
      id: 9,
      name: 'Get_TV',
      streamUrl: 'https://d2bdj57e36jme2.cloudfront.net/714405f3ee5f4a1ebdae65a20b8bf3cc/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_GSN', flowARN: 'vubiquity_Value_GSN', flowConnected: false },
        { flowName: 'nextologies_Value_GSN', flowARN: 'nextologies_Value_GSN', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_GSN - clone',
      id: 10,
      name: 'GSN',
      streamUrl: 'https://d3drnpkv3sqobz.cloudfront.net/7a0947b1c7fe40ad888d4d3cbcdbfb43/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_HDNET', flowARN: 'vubiquity_Value_HDNET', flowConnected: false },
        { flowName: 'nextologies_Value_HDNET', flowARN: 'nextologies_Value_HDNET', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_HDNET - clone',
      id: 11,
      name: 'HDNET',
      streamUrl: 'https://d1usqf0c34ux16.cloudfront.net/426892ba7a3f4ab2999e52b6ba74fb13/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_Reelz', flowARN: 'vubiquity_Value_Reelz', flowConnected: false },
        { flowName: 'nextologies_Reelz_backup', flowARN: 'nextologies_Reelz_backup', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_Reelz - SCTE35',
      id: 12,
      name: 'Reelz',
      streamUrl: 'https://d3drnpkv3sqobz.cloudfront.net/971f8b30a6d24abe9ec6545837239972/index_10.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_INSP', flowARN: 'vubiquity_Value_INSP', flowConnected: false },
        { flowName: 'nextologies_INSP_backup', flowARN: 'nextologies_INSP_backup', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_INSP - clone',
      id: 13,
      name: 'INSP',
      streamUrl: 'https://d3drnpkv3sqobz.cloudfront.net/fdf858c9655c4f71bcacf85335e4eb8f/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'vubiquity_Value_SONYMOVIES', flowARN: 'vubiquity_Value_SONYMOVIES', flowConnected: false },
        { flowName: 'nextologies_Sony_backup', flowARN: 'nextologies_Sony_backup', flowConnected: false },
      ],
      channel_name: 'vubiquity_Value_SONYMOVIES - clone',
      id: 14,
      name: 'SONY',
      streamUrl: 'https://d1usqf0c34ux16.cloudfront.net/069793ec4b7648d88d19417155a731b2/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'Weathernation_Primary', flowARN: 'Weathernation_Primary', flowConnected: false },
        { flowName: 'weathernation_backup', flowARN: 'weathernation_backup', flowConnected: false },
      ],
      channel_name: 'Value_Weathernation',
      id: 15,
      name: 'Weather',
      streamUrl: 'https://d1usqf0c34ux16.cloudfront.net/293efe12aa3646559813d761a2e930d2/index_14.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'comcast_Value_UP_TV_backup', flowARN: 'comcast_Value_UP_TV_backup', flowConnected: false },
        { flowName: 'comcast_Value_UP_TV_clone', flowARN: 'comcast_Value_UP_TV_clone', flowConnected: false },
      ],
      channel_name: 'comcast_Value_UP_TV',
      id: 16,
      name: 'UP_TV',
      streamUrl: 'https://d1usqf0c34ux16.cloudfront.net/ba1ebedfcc5b49e490ad6c235e65a728/index_1.m3u8',
      state: 'RUNNING',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
    {
      flows: [
        { flowName: 'freecast_LTN_PlayingForChange', flowARN: 'freecast_LTN_PlayingForChange', flowConnected: false },
        { flowName: 'freecast_LTN_PlayingForChange-backup', flowARN: 'freecast_LTN_PlayingForChange-backup', flowConnected: false },
      ],
      channel_name: 'freecast_LTN_PlayingForChange',
      id: 19,
      name: 'LTN_PFC',
      streamUrl: 'https://d2h0nsadrf7r2o.cloudfront.net/fe481822826a4fde9bcb63c4fa798c93/index_1.m3u8',
      state: 'IDLE',
      activeInputName: 'Primary',
      secondayInputName: 'Backup',
      active: 'Primary',
    },
  ],
  alarms: [],
  loading: false,
  error: null,
};

export const fetchChannels = createAsyncThunk(
  'channelMonitor/fetchChannels',
  async () => {
    const response = await getChannelInfo();
    return response;
  },
);

export const fetchChannelAlarm = createAsyncThunk(
  'channelMonitor/fetchChannelAlarm',
  async (channelName: string, { getState }) => {
    const response = await fetchAlarm(channelName);

    const state = getState() as { channelMonitor: ChannelMonitorState };
    const previousAlarms = state.channelMonitor.alarms;
    const otherChannelsAlarms = previousAlarms.filter(
      (alarm) => alarm.channel !== channelName,
    );

    const updatedAlarms = [...otherChannelsAlarms, ...response];

    return updatedAlarms;
  },
);

const channelMonitorSlice = createSlice({
  name: 'channelMonitor',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    /* eslint-disable no-param-reassign */
    builder
      .addCase(fetchChannels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.loading = false;
        state.channels = action.payload.channels.map((channel) => ({
          ...channel,
          // eslint-disable-next-line no-param-reassign
          flows: channel.flows,
        }));
        state.alarms = action.payload.alamrs;
      })
      .addCase(fetchChannels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch channels';
      })
      .addCase(fetchChannelAlarm.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchChannelAlarm.fulfilled, (state, action) => {
        state.loading = false;
        state.alarms = action.payload;
      })
      .addCase(fetchChannelAlarm.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch channels';
      });
    /* eslint-enable no-param-reassign */
  },
});

export default channelMonitorSlice.reducer;
