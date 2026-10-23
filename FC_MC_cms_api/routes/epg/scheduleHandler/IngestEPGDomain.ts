import { EPGDto, EPGRequestDto } from '../../shared/dto/EPGDto';
import { EpgTemplateType } from '../../shared/dto/EPGTemplateDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IIngestEPGDomain } from '../ingestEPG/IIngestEPGDomain';
import EPG from '../shared/EPG';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import { EPGProgram, GenericObject, IParser } from '../shared/IParser';

interface Parser {
  csv: IParser<GenericObject, EPGProgram>,
  json: IParser<GenericObject, EPGProgram>,
  xml: IParser<GenericObject, EPGProgram>
}

export default class IngestEPGDomain implements IIngestEPGDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly parser: Parser,
    private readonly epgFactory: IFactory<EPG, EPGRequestDto, EPGDto>,
  ) {
  }

  private keepOldPrograms(oldPrograms: Array<EPGProgram>, newPrograms: Array<EPGProgram>) {
    const oldExtIds = oldPrograms.map((oldProgram) => oldProgram.ext_id);

    return [
      ...oldPrograms,
      ...newPrograms.filter((newProgram) => !oldExtIds.includes(newProgram.ext_id)),
    ];
  }

  private async parseEpg(epg: EPG) {
    let rawEPG: GenericObject;
    const { epgTemplate } = epg;
    switch (epgTemplate.templateType) {
      case EpgTemplateType.JSON:
        rawEPG = await this.parser.json.fetch(epg.ingestionUrl);
        return this.keepOldPrograms(
          epg.programs,
          this.parser.json.parse(rawEPG, epgTemplate.mapping),
        );

      case EpgTemplateType.CSV:
        rawEPG = await this.parser.csv.fetch(epg.ingestionUrl);
        return this.keepOldPrograms(
          epg.programs,
          this.parser.csv.parse(rawEPG, epgTemplate.mapping),
        );

      case EpgTemplateType.XML:
        rawEPG = await this.parser.xml.fetch(epg.ingestionUrl);
        return this.keepOldPrograms(
          epg.programs,
          this.parser.xml.parse(rawEPG, epgTemplate.mapping),
        );

      default:
        throw new EPGError.UnknownEPGDependency();
    }
  }

  async ingestEPG(id: string): Promise<void> {
    const epg = await this.epgRepository.findOne(id, { filter: {}, ignore: true });
    if (!epg) {
      throw new EPGError.EPGNotFound();
    }
    const programs = await this.parseEpg(epg);

    // Exclude the invalid programs
    const validPrograms = programs.filter(
      (program) => program.start_time && program.end_time && program.title,
    );
    // Skip the update if there are no valid programs
    if (validPrograms.length === 0) {
      return;
    }

    const rawEpg = await this.epgFactory.toPersistence(epg);
    const updatedEpg = await this.epgFactory.toDomain({
      ...rawEpg,
      updatedAt: new Date().toISOString(),
      programs: validPrograms,
    });
    await this.epgRepository.ingestEPG(updatedEpg);
  }
}
