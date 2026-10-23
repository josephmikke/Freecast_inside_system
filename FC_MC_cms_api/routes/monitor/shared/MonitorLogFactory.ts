import { MonitorLogDTO } from '../../shared/dto/MonitorLogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

export default class MonitorLogFactory implements IFactory<MonitorLogDTO, MonitorLogDTO, MonitorLogDTO> {
  private readonly uid: UIDGenerator;

  constructor(uid: UIDGenerator) {
    this.uid = uid;
  }

  toDomain(raw: MonitorLogDTO): MonitorLogDTO | Promise<MonitorLogDTO> {
    return this.create(raw);
  }

  toPersistence(raw: MonitorLogDTO): MonitorLogDTO {
    return raw;
  }

  create(data: Partial<MonitorLogDTO>): MonitorLogDTO {
    return {
      id: data.id || this.uid.generate(8),
      channel: data.channel!,
      timestamp: data.timestamp || [new Date(Date.now())],
      message: data.message!,
      level: data.level!,
      metadata: data.metadata || {}
    };
  }
}