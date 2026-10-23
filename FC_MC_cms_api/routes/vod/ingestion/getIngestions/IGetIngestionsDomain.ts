import { IngestionQueryParameters } from '../../../shared/dto/vod/IngestDto';
import { IngestionPage } from '../shared/IIngestionRepository';

export interface IGetIngestionsDomain {
  getIngestions(ingestionParams: IngestionQueryParameters): Promise<IngestionPage>
}
