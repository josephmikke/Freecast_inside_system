import drainResponse from '../drainResponse';
import { EPGError } from '../EPGError';
import { IEPGProgramBuilder } from '../IEPGProgramBuilder';
import { IHttpClient } from '../IHttpClient';
import { EPGProgram, IParser, GenericObject } from '../IParser';
import { ITransformer } from '../ITransformer';

import { ICSVToObject } from './ICSVToObject';

export default class CSVParserAdaptor implements IParser<GenericObject, EPGProgram> {
  constructor(
    private readonly httpClient: IHttpClient<Response>,
    private readonly csvToObject: ICSVToObject<GenericObject>,
    private readonly transformer: ITransformer,
    private builder: IEPGProgramBuilder<EPGProgram>,
  ) {
  }

  private static isNotNull(property: string) {
    return !!property;
  }

  private static isNull(property: string) {
    return !property;
  }

  async fetch(url: string): Promise<GenericObject> {
    try {
      const response = await this.httpClient.get(url);
      if (response.status > 201) {
        await drainResponse(response);
        throw new EPGError.UnableToFetchEPG(response.statusText);
      }
      return { value: await response.text() };
    } catch (e) {
      throw new EPGError.UnableToFetchEPG(e);
    }
  }

  parse(payload: GenericObject, mappingTemplate: GenericObject): Array<EPGProgram> {
    try {
      const epgList = this.csvToObject.toObjectArray(payload.value);
      return epgList.map((epg) => this.parseEpg(epg, mappingTemplate));
    } catch (e) {
      throw new EPGError.UnableToParseEPG(e);
    }
  }

  private parseEpg(epg: GenericObject, mappingTemplate: GenericObject): EPGProgram {
    const {
      date: epgStartTimeDate,
      date_format: epgStartTimeDateFormat,
      time: epgStartTimeTime,
      time_format: epgStartTimeTimeFormat,
    } = this.getStartTimeDateObjects(epg, mappingTemplate);
    const {
      date: epgEndTimeDate,
      date_format: epgEndTimeDateFormat,
      time: epgEndTimeTime,
      time_format: epgEndTimeTimeFormat,
    } = this.getEndTimeDateObjects(epg, mappingTemplate);

    // We need a new instance each time we call parseEpg
    const epgBuilder = this.builder.create(this.builder.uid);
    epgBuilder.addTitle(epg[mappingTemplate.title])
      .addDescription(epg[mappingTemplate.description])
      .addExtId(epg[mappingTemplate.ext_id]);

    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'subtitle')) {
      epgBuilder.addSubtitle(epg[mappingTemplate.subtitle]);
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'slug')) {
      epgBuilder.addSlug(epg[mappingTemplate.slug]);
    }
    if (CSVParserAdaptor.isNotNull(mappingTemplate.start_time.time)) {
      epgBuilder.addStartTime(this.transformer.concatDatetime({
        date: epgStartTimeDate,
        time: epgStartTimeTime,
        dateFormat: epgStartTimeDateFormat,
        timeFormat: epgStartTimeTimeFormat,
      }));
    } else if (CSVParserAdaptor.isNotNull(mappingTemplate.start_time.date_format)) {
      epgBuilder.addStartTime(this.transformer.formatDatetime(
        epgStartTimeDate,
        epgStartTimeDateFormat,
      ));
    } else {
      epgBuilder.addStartTime(epg[mappingTemplate.start_time.date]);
    }

    const epgDuration = epg[mappingTemplate.duration.duration];

    if (CSVParserAdaptor.isNotNull(epgDuration)) {
      const durationFormat: string = mappingTemplate.duration.duration_format;
      epgBuilder.addDuration(this.transformer.transformDuration({
        durationFormat,
        duration: epgDuration,
      }));
    }

    if (CSVParserAdaptor.isNotNull(mappingTemplate.end_time.time)) {
      epgBuilder.addEndTime(this.transformer.concatDatetime({
        date: epgEndTimeDate,
        time: epgEndTimeTime,
        timeFormat: epgEndTimeTimeFormat,
        dateFormat: epgEndTimeDateFormat,
      }));
    } else if (CSVParserAdaptor.isNotNull(mappingTemplate.end_time.date_format)) {
      epgBuilder.addEndTime(this.transformer.formatDatetime(
        epgEndTimeDate,
        epgEndTimeDateFormat,
      ));
    } else if (CSVParserAdaptor.isNotNull(mappingTemplate.end_time.date)) {
      epgBuilder.addEndTime(epg[mappingTemplate.end_time.date]);
    } else {
      const { duration } = epgBuilder.getResult();
      epgBuilder.addEndTime(this.transformer.computeEndTime({
        startTime: epgBuilder.getResult().start_time,
        duration: duration === '' ? '0' : duration,
      }));
    }

    if (CSVParserAdaptor.isNull(epgDuration)) {
      epgBuilder.addDuration(this.transformer.transformDuration({
        durationFormat: '',
        startTime: epgBuilder.getResult().start_time,
        endTime: epgBuilder.getResult().end_time,
      }));
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'thumbnail')) {
      epgBuilder.addThumbnail(epg[mappingTemplate.thumbnail]);
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'alternateThumbnail')) {
      epgBuilder
        .addAlternateThumbnail(epg[mappingTemplate.alternateThumbnail]);
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'catchup')) {
      epgBuilder.setCatchup(true);
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'archive')) {
      epgBuilder.setArchive(true);
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'rating')) {
      epgBuilder.setRating(epg[mappingTemplate.rating]);
    }
    return epgBuilder.getResult();
  }

  private getEndTimeDateObjects(epg: GenericObject, mappingTemplate: GenericObject): GenericObject {
    return {
      date: epg[mappingTemplate.end_time.date],
      time: CSVParserAdaptor.isNotNull(mappingTemplate.end_time.time)
          && epg[mappingTemplate.end_time.time],
      date_format: mappingTemplate.end_time.date_format,
      time_format: mappingTemplate.end_time.time_format,
    };
  }

  private getStartTimeDateObjects(
    epg: GenericObject,
    mappingTemplate: GenericObject,
  ): GenericObject {
    return {
      date: epg[mappingTemplate.start_time.date],
      time: CSVParserAdaptor.isNotNull(mappingTemplate.start_time.time)
          && epg[mappingTemplate.start_time.time],
      date_format: mappingTemplate.start_time.date_format,
      time_format: mappingTemplate.start_time.time_format,
    };
  }
}
