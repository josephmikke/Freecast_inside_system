export const csvMappingTemplate: JSON = <JSON><unknown> {
  title: 'Title',
  ext_id: 'SeriesId',
  start_time: {
    date: 'StartTime',
    date_format: '%d/%m/%Y %H:%M',
    time: '',
    time_format: '',
    method: 'concat',
  },
  end_time: {
    date: 'EndTime',
    date_format: '%d/%m/%Y %H:%M',
    time: '',
    time_format: '',
    method: 'concat',
  },
  duration: {
    duration: 'Duration',
    duration_format: 'minutes',
  },
  thumbnail: 'Image',
  description: 'Description',
};

export const csvPayload: string = 'Title,SeriesId,StartTime,EndTime,Duration,Image,Description\nGrateTV All Day,32563,09/12/2022 05:30,09/12/2022 06:30,60,,GrateTV All Day\nJimmy Houston Outdoor,32564,09/12/2022 06:30,09/12/2022 08:30,120,,Jimmy Houston Outdoor';

export const csvMappingTemplate2: JSON = <JSON><unknown> {
  title: 'Title',
  ext_id: 'SeriesId',
  start_time: {
    date: 'StartTimeDate',
    date_format: '%d/%m/%Y',
    time: 'StartTimeTime',
    time_format: '%H:%M',
    method: 'concat',
  },
  end_time: {
    date: 'EndTimeDate',
    date_format: '%d/%m/%Y',
    time: 'EndTimeTime',
    time_format: '%H:%M',
    method: 'concat',
  },
  duration: {
    duration: 'Duration',
    duration_format: '',
  },
  thumbnail: 'Image',
  description: 'Description',
  catchup: true,
};

export const csvPayload2: string = 'Title,SeriesId,StartTimeDate,StartTimeTime,EndTimeDate,EndTimeTime,Duration,Image,Description\nGrateTV All Day,32563,09/12/2022,05:30,09/12/2022,06:30,,,GrateTV All Day\nJimmy Houston Outdoor,32564,09/12/2022,06:30,09/12/2022,08:30,,,Jimmy Houston Outdoor';

export const csvMappingTemplate3: JSON = <JSON><unknown> {
  title: 'Title',
  subtitle: 'Subtitle',
  slug: 'Slug',
  ext_id: 'SeriesId',
  start_time: {
    date: 'StartTimeDate',
    date_format: '',
    time: '',
    time_format: '',
    method: 'concat',
  },
  end_time: {
    date: 'EndTimeDate',
    date_format: '',
    time: '',
    time_format: '',
    method: 'concat',
  },
  duration: {
    duration: 'Duration',
    duration_format: '',
  },
  thumbnail: 'Image',
  description: 'Description',
  catchup: true,
};

export const csvPayload3: string = 'Title,Subtitle,Slug,SeriesId,StartTimeDate,EndTimeDate,Duration,Image,Description\nGrateTV All Day,GrateTV,333,32563,2022-12-09T05:30:00Z,2022-12-09T06:30:00Z,,,GrateTV All Day\nJimmy Houston Outdoor,Jimmy,444,33332564,2022-12-09T06:30:00Z,2022-12-09T08:30:00Z,,,Jimmy Houston Outdoor';
