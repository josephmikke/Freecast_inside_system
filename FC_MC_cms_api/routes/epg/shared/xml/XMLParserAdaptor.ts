import drainResponse from '../drainResponse';
import { EPGError } from '../EPGError';
import { IEPGProgramBuilder } from '../IEPGProgramBuilder';
import { IHttpClient } from '../IHttpClient';
import { EPGProgram, IParser, GenericObject } from '../IParser';
import { ITransformer } from '../ITransformer';

import { IXMLPath } from './IXMLPath';

export default class XMLParserAdaptor implements IParser<GenericObject, EPGProgram> {
  private readonly httpClient: IHttpClient<Response>;

  private readonly xmlPath: IXMLPath<GenericObject>;

  private readonly transformer: ITransformer;

  private builder: IEPGProgramBuilder<EPGProgram>;

  constructor(
    httpClient: IHttpClient<Response>,
    xmlPath: IXMLPath<GenericObject>,
    transformer: ITransformer,
    builder: IEPGProgramBuilder<EPGProgram>,
  ) {
    this.httpClient = httpClient;
    this.xmlPath = xmlPath;
    this.transformer = transformer;
    this.builder = builder;
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
      const epgList: Array<GenericObject> = this.xmlPath
        .toXMlObject(payload.value, mappingTemplate.epg_program);

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
    epgBuilder.addTitle(this.xmlPath.select(epg, mappingTemplate.title))
      .addDescription(this.xmlPath.select(epg, mappingTemplate.description))
      .addExtId(this.xmlPath.select(epg, mappingTemplate.ext_id));

    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'subtitle')) {
      epgBuilder.addSubtitle(this.xmlPath.select(epg, mappingTemplate.subtitle));
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'slug')) {
      epgBuilder.addSlug(this.xmlPath.select(epg, mappingTemplate.slug));
    }
    if (XMLParserAdaptor.isNotNull(mappingTemplate.start_time.time)) {
      epgBuilder.addStartTime(this.transformer.concatDatetime({
        date: epgStartTimeDate,
        time: epgStartTimeTime,
        dateFormat: epgStartTimeDateFormat,
        timeFormat: epgStartTimeTimeFormat,
      }));
    } else if (XMLParserAdaptor.isNotNull(mappingTemplate.start_time.date_format)) {
      epgBuilder.addStartTime(this.transformer.formatDatetime(
        epgStartTimeDate,
        epgStartTimeDateFormat,
      ));
    } else {
      epgBuilder.addStartTime(this.xmlPath.select(epg, mappingTemplate.start_time.date));
    }

    const epgDuration = this.xmlPath.select(epg, mappingTemplate.duration.duration);

    if (XMLParserAdaptor.isNotNull(epgDuration)) {
      const durationFormat: string = mappingTemplate.duration.duration_format;
      epgBuilder.addDuration(this.transformer.transformDuration({
        durationFormat,
        duration: epgDuration,
      }));
    }

    if (XMLParserAdaptor.isNotNull(mappingTemplate.end_time.time)) {
      epgBuilder.addEndTime(this.transformer.concatDatetime({
        date: epgEndTimeDate,
        time: epgEndTimeTime,
        timeFormat: epgEndTimeTimeFormat,
        dateFormat: epgEndTimeDateFormat,
      }));
    } else if (XMLParserAdaptor.isNotNull(mappingTemplate.end_time.date_format)) {
      epgBuilder.addEndTime(this.transformer.formatDatetime(
        epgEndTimeDate,
        epgEndTimeDateFormat,
      ));
    } else if (XMLParserAdaptor.isNotNull(mappingTemplate.end_time.date)) {
      epgBuilder.addEndTime(this.xmlPath.select(epg, mappingTemplate.end_time.date));
    } else {
      const { duration } = epgBuilder.getResult();
      epgBuilder.addEndTime(this.transformer.computeEndTime({
        startTime: epgBuilder.getResult().start_time,
        duration: duration === '' ? '0' : duration,
      }));
    }

    if (XMLParserAdaptor.isNull(epgDuration)) {
      epgBuilder.addDuration(this.transformer.transformDuration({
        durationFormat: '',
        startTime: epgBuilder.getResult().start_time,
        endTime: epgBuilder.getResult().end_time,
      }));
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'thumbnail')) {
      epgBuilder.addThumbnail(this.xmlPath.select(epg, mappingTemplate.thumbnail));
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'alternateThumbnail')) {
      epgBuilder
        .addAlternateThumbnail(this.xmlPath.select(epg, mappingTemplate.alternateThumbnail));
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'catchup')) {
      epgBuilder.setCatchup(true);
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'archive')) {
      epgBuilder.setArchive(true);
    }
    if (Object.prototype.hasOwnProperty.call(mappingTemplate, 'rating')) {
      epgBuilder.setRating(this.xmlPath.select(epg, mappingTemplate.rating));
    }
    return epgBuilder.getResult();
  }

  private getEndTimeDateObjects(epg: GenericObject, mappingTemplate: GenericObject): GenericObject {
    return {
      date: this.xmlPath.select(epg, mappingTemplate.end_time.date),
      time: XMLParserAdaptor.isNotNull(mappingTemplate.end_time.time)
          && this.xmlPath.select(epg, mappingTemplate.end_time.time),
      date_format: mappingTemplate.end_time.date_format,
      time_format: mappingTemplate.end_time.time_format,
    };
  }

  private getStartTimeDateObjects(
    epg: GenericObject,
    mappingTemplate: GenericObject,
  ): GenericObject {
    return {
      date: this.xmlPath.select(epg, mappingTemplate.start_time.date),
      time: XMLParserAdaptor.isNotNull(mappingTemplate.start_time.time)
          && this.xmlPath.select(epg, mappingTemplate.start_time.time),
      date_format: mappingTemplate.start_time.date_format,
      time_format: mappingTemplate.start_time.time_format,
    };
  }
}
