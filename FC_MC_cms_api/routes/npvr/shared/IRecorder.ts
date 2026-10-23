export interface StartRecordingProps<T> {
  id: string,
  // TODO: Create ValueObject
  startTime: string,
  // TODO: Create ValueObject
  endTime: string,
  channel: string,
  destination: T,
}

export interface IRecorder<T> {
  startRecording(params: StartRecordingProps<T>): Promise<boolean>
}
