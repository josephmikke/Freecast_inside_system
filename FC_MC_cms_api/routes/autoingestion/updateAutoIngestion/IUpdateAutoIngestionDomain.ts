import { AutoIngestionRequestDto } from '../../shared/dto/AutoIngestionDto';

export interface IUpdateAutoIngestionDomain {
  updateAutoIngestion(
    id: string,
    newProps: Partial<AutoIngestionRequestDto> & { enabled?: boolean },
  ): Promise<boolean>
}
