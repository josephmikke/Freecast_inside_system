import { MonitorLogDTO } from "routes/shared/dto/MonitorLogDto"

export interface IMonitorLogRepository {
    findAll(): Promise<Array<MonitorLogDTO>>
    findOne(flow: string): Promise<MonitorLogDTO[]>
    exists(item: MonitorLogDTO): Promise<boolean>
    save(item: MonitorLogDTO): Promise<boolean>
}
