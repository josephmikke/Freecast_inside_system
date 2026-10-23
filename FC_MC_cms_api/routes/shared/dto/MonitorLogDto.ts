export const monitorLogSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    channel: { type: 'string' },
    timestamp: { type: 'number' },
    message: { type: 'string' },
    level: { type: 'string' },
    metadata: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['id', 'channel', 'timestamp', 'message', 'level'],
} as const;

export interface MonitorLogDTO {
  id: string;
  channel: string;  // maps to flow-name
  timestamp: Date[];  // maps to event-time
  message: string;  // maps to description
  level: string;  // maps to GSI1-SK
  metadata?: {
    flowArn?: string;
    extId?: string;
    createdAt?: string;
    updatedAt?: string;
    entity?: string;
    title?: string;
    [key: string]: any;
  };
}

export interface GetMonitorLogsEvent {
  pathParameters: {
    channel: string;
  };
  queryStringParameters?: {
    startDate?: string;
    endDate?: string;
    level?: string;
  };
}

export interface GetMonitorLogEvent {
  pathParameters: {
    channel: string;
  };
}