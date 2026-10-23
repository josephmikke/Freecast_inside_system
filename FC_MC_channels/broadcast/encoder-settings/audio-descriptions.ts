export default [
  {
    CodecSettings: {
      AacSettings: {
        InputType: 'NORMAL',
        Bitrate: 64000,
        CodingMode: 'CODING_MODE_2_0',
        RawFormat: 'NONE',
        Spec: 'MPEG4',
        Profile: 'LC',
        RateControlMode: 'CBR',
        SampleRate: 48000,
      },
    },
    AudioTypeControl: 'FOLLOW_INPUT',
    LanguageCodeControl: 'FOLLOW_INPUT',
    Name: 'audio_aac64',
  },
  {
    CodecSettings: {
      AacSettings: {
        InputType: 'NORMAL',
        Bitrate: 128000,
        CodingMode: 'CODING_MODE_2_0',
        RawFormat: 'NONE',
        Spec: 'MPEG4',
        Profile: 'LC',
        RateControlMode: 'CBR',
        SampleRate: 48000,
      },
    },
    AudioTypeControl: 'FOLLOW_INPUT',
    LanguageCodeControl: 'FOLLOW_INPUT',
    Name: 'audio_aac128',
  },
];
