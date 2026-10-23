import * as swim from '@swim/time';
import { DateTime } from 'luxon';

import {
  ComputeEndTimeProps, ConcatDatetimeProps, ITransformer, TransformDurationProps,
} from './ITransformer';

export default class TransformerAdaptor implements ITransformer {
  private static SECONDS_TO_MINUTE = 60;

  private static SECONDS_TO_HOUR = 3600;

  private static DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss'Z'";

  private static ZONE = 'utc';

  private static isNotUndefined(value?: string): value is string {
    return typeof value !== 'undefined';
  }

  transformDuration({
    durationFormat,
    duration,
    startTime,
    endTime,
  }: TransformDurationProps): string {
    switch (durationFormat) {
      case 'seconds': {
        if (TransformerAdaptor.isNotUndefined(duration)) {
          return Number(duration).toString();
        }
        break;
      }
      case 'minutes': {
        if (TransformerAdaptor.isNotUndefined(duration)) {
          return (Number(duration) * TransformerAdaptor.SECONDS_TO_MINUTE).toString();
        }
        break;
      }
      case 'hours': {
        if (TransformerAdaptor.isNotUndefined(duration)) {
          return (Number(duration) * TransformerAdaptor.SECONDS_TO_HOUR).toString();
        }
        break;
      }
      case 'datetime_format': {
        if (TransformerAdaptor.isNotUndefined(duration)) {
          const splitHMS = duration.split(':');

          return (Number(splitHMS[0]) * TransformerAdaptor.SECONDS_TO_HOUR
            + Number(splitHMS[1]) * TransformerAdaptor.SECONDS_TO_MINUTE
            + Number(splitHMS[2])).toString();
        }
        break;
      }
      default: {
        if (TransformerAdaptor.isNotUndefined(startTime)
          && TransformerAdaptor.isNotUndefined(endTime)) {
          const start = DateTime.fromISO(startTime!);
          const end = DateTime.fromISO(endTime!);
          const diff = end.diff(start);

          return diff.toFormat('s');
        }
        return '0';
      }
    }
    return '0';
  }

  concatDatetime({
    date, time, dateFormat, timeFormat,
  }: ConcatDatetimeProps): string {
    const swimDate = swim.DateTimeFormat.pattern(dateFormat).parse(date);
    const isoDate = swimDate.toString();
    const parsedDate = DateTime.fromISO(isoDate, { zone: TransformerAdaptor.ZONE });

    const swimTime = swim.DateTimeFormat.pattern(timeFormat).parse(time);
    const isoTime = swimTime.toString();
    const parsedTime = DateTime.fromISO(isoTime, { zone: TransformerAdaptor.ZONE });

    const datetime = parsedDate.set({
      hour: parsedTime.get('hour'),
      minute: parsedTime.get('minute'),
      second: parsedTime.get('second'),
      millisecond: 0,
    });

    return datetime.toFormat(TransformerAdaptor.DATETIME_FORMAT);
  }

  formatDatetime(date: string, format: string): string {
    let swimDate;

    // check if there is a Timezone offset on the template
    if (format.includes('%z')) {
      // split the date on the timezone
      const dateSplit = date.split(' ');
      const offsetString = dateSplit[1];

      // Swin Offset works with minutes, so we get the hours from the offset
      // and multiply by 60 and then add the minutes while keeping the + or -
      const offsetNumber = 60 * parseFloat(offsetString.substring(0, 3))
        + parseFloat(offsetString.substring(0, 1) + offsetString.substring(3));
      const timezone = swim.TimeZone.forOffset(offsetNumber);

      // split the format on the timezone
      const formatSplit = format.split(' ');
      swimDate = swim.DateTimeFormat.pattern(formatSplit[0]).parse(dateSplit[0]);

      swimDate = new swim.DateTime(swimDate.time, timezone);
    } else {
      swimDate = swim.DateTimeFormat.pattern(format).parse(date);
    }

    const isoDate = swimDate.toString();

    const parsedDate = DateTime.fromISO(isoDate, { zone: TransformerAdaptor.ZONE });

    return parsedDate.toFormat(TransformerAdaptor.DATETIME_FORMAT);
  }

  computeEndTime(params: ComputeEndTimeProps): string {
    const computedEndTime = new Date(params.startTime);

    computedEndTime.setSeconds(computedEndTime.getSeconds() + Number(params.duration));
    return computedEndTime.toISOString();
  }
}
