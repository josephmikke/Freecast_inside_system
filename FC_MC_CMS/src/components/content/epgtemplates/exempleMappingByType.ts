const exempleMappingByType = {
  CSV: `{
\t"title": "Title",
\t"ext_id": "SeriesId",
\t"start_time": {
\t\t"date": "StartTime",
\t\t"date_format": "%Y-%m-%d %H:%M:%S",
\t\t"time": "",
\t\t"time_format": "",
\t\t"method": "concat"
\t},
\t"end_time": {
\t\t"date": "EndTime",
\t\t"date_format": "%Y-%m-%d %H:%M:%S",
\t\t"time": "",
\t\t"time_format": "",
\t\t"method": "concat"
\t},
\t"duration": {
\t\t"duration": "Duration",
\t\t"duration_format": "minutes"
\t},
\t"thumbnail": "Image",
\t"description": "Description"
}`,
  JSON: `{
\t"title": "$.title",
\t"ext_id": "$.ext_id",
\t"epgs_list": "$[0]",
\t"thumbnail": "$.thumbnail",
\t"start_time": {
\t\t"date": "$.start_time",
\t\t"date_format": "%Y-%m-%d %H:%M:%S",
\t\t"time": "",
\t\t"time_format": "",
\t\t"method": "concat"
\t},
\t"end_time": {
\t\t"date": "$.end_time",
\t\t"date_format": "%Y-%m-%d %H:%M:%S",
\t\t"time": "",
\t\t"time_format": "",
\t\t"method": "concat"
\t},
\t"duration": {
\t\t"duration": "$.duration",
\t\t"duration_format": "minutes"
\t},
\t"description": "$.description",
\t"epg_program": "$.epg_programs"
}`,
  WURL: `{
\t"ext_id": "$.id",
\t"title": "$.title",
\t"thumbnail": "$.thumbnail",
\t"description": "$.shortDescription",
\t"duration": {
\t\t"duration": "$.durationInSeconds",
\t\t"duration_format": "seconds"
\t},
\t"start_time": {
\t\t"date": "$.date",
\t\t"time": "$.times[0]",
\t\t"method": "concat",
\t\t"date_format": "%Y-%m-%d",
\t\t"time_format": "%H:%M:%S"
\t},
\t"movies": "$.movies[*]",
\t"episodes": "$.series[*].seasons[*].episodes[*]",
\t"shortVideos": "$.shortFormVideos[*]",
\t"specials": "$.tvSpecials[*]",
\t"schedules": "$.liveFeeds[*].content.schedule[*]"
}`,
  XML: `{
  "title": "title",
  "ext_id": "@channel",
  "duration": {
    "duration": "",
    "duration_format": ""
  },
  "end_time": {
    "date": "@stop",
    "time": "",
    "method": "",
    "date_format": "%Y%m%d%H%M%S %z",
    "time_format": ""
  },
  "thumbnail": "icon/@src",
  "start_time": {
    "date": "@start",
    "time": "",
    "method": "concat",
    "date_format": "%Y%m%d%H%M%S %z",
    "time_format": ""
  },
  "description": "desc",
  "epg_program": "//tv/programme"
}`,
  'XLS/XLSX': `{
\t"ext_id": "Id",
\t"date": "Date",
\t"duration": {
\t\t"duration": "Duration",
\t\t"duration_format": ""
\t},
\t"title": "Program",
\t"subtitle": "Episode Name",
\t"description": "Episode Synopsis"
}`,
  GRID: 'No mapping',
  default: 'No mapping',
};

export default exempleMappingByType;
