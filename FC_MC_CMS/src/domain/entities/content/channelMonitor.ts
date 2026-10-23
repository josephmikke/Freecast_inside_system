export interface Channel {
  id: number;
  name: string;
  streamUrl: string;
  channel_name: string;
  state: string;
  activeInputName: string;
  secondayInputName: string;
  active: string;
  flows: { flowName: string, flowARN: string, flowConnected: boolean }[] | [];
}

export interface ChannelMonitorResult {
  id: string;
  channels: Channel[];
}
interface Alarm {

  message : string;
  timestamp : string[];
  title : string;
}

export interface ChannelAlarms {
  channel: string;
  alarms: Alarm;
}
