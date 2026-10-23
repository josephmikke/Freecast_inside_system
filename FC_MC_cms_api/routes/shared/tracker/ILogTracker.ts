export interface ILogTracker<Dto> {
  track(payload: Dto): Promise<void>
}
