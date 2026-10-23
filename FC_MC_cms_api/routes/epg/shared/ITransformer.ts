export interface ConcatDatetimeProps {
  date: string;
  time: string;
  dateFormat: string;
  timeFormat: string;
}

export interface TransformDurationProps {
  durationFormat: string;
  duration?: string;
  startTime?: string;
  endTime?: string;
}

export interface ComputeEndTimeProps {
  duration: string;
  startTime: string;
}

export interface ITransformer {
  transformDuration(params: TransformDurationProps): string;
  concatDatetime(params: ConcatDatetimeProps): string;
  formatDatetime(date: string, dateFormat: string): string;
  computeEndTime(params: ComputeEndTimeProps): string;
}
