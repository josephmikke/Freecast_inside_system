// eslint-disable-next-line max-classes-per-file
import { IEsamGenerator } from '../IEsamGenerator';

export namespace EsamXMLError {
  export class InvalidCuePoint extends Error {
  }
}

export default class EsamXMLAdaptor implements IEsamGenerator {
  private readonly cuePointRegExp = /(\d+\.?\d*)/;

  private readonly expectedAdDurationSeconds = 60;

  private secondsToPts(seconds: number): number {
    return Math.round(seconds * 90000);
  }

  private generateSpliceInsertCueOutBase64(spliceEventId: number, ptsTime: number): string {
    const buffer: number[] = [];

    buffer.push(0xFC);

    const sectionLengthPos = buffer.length;
    buffer.push(0x30);
    buffer.push(0x00);

    buffer.push(0x00);

    buffer.push(0x00, 0x00, 0x00, 0x00, 0x00);

    buffer.push(0x00);

    const tierAndCmdLengthPos = buffer.length;
    buffer.push(0xFF);
    buffer.push(0xF0);
    buffer.push(0x00);

    buffer.push(0x05);

    const spliceInsertStart = buffer.length;

    // splice_event_id (32 bits)
    buffer.push((spliceEventId >> 24) & 0xFF);
    buffer.push((spliceEventId >> 16) & 0xFF);
    buffer.push((spliceEventId >> 8) & 0xFF);
    buffer.push(spliceEventId & 0xFF);

    buffer.push(0x7F);

    buffer.push(0xEF);

    buffer.push(0xFE | ((ptsTime >> 32) & 0x01));
    buffer.push((ptsTime >> 24) & 0xFF);
    buffer.push((ptsTime >> 16) & 0xFF);
    buffer.push((ptsTime >> 8) & 0xFF);
    buffer.push(ptsTime & 0xFF);

    buffer.push(0xFE);
    buffer.push(0x00, 0x00, 0x00, 0x00);

    buffer.push(0x00, 0x01);
    buffer.push(0x00);
    buffer.push(0x00);

    const spliceInsertEnd = buffer.length;
    const spliceCommandLength = spliceInsertEnd - spliceInsertStart;

    buffer.push(0x00, 0x00);

    const sectionLengthWithoutCrc = buffer.length - 3;
    const sectionLength = sectionLengthWithoutCrc + 4;

    buffer[sectionLengthPos] = 0x30 | ((sectionLength >> 8) & 0x0F);
    buffer[sectionLengthPos + 1] = sectionLength & 0xFF;

    buffer[tierAndCmdLengthPos + 1] = 0xF0 | ((spliceCommandLength >> 8) & 0x0F);
    buffer[tierAndCmdLengthPos + 2] = spliceCommandLength & 0xFF;

    const crc = this.calculateCrc32Mpeg2(buffer);
    buffer.push((crc >> 24) & 0xFF);
    buffer.push((crc >> 16) & 0xFF);
    buffer.push((crc >> 8) & 0xFF);
    buffer.push(crc & 0xFF);

    return Buffer.from(new Uint8Array(buffer)).toString('base64');
  }

  private generateSpliceInsertCueInBase64(spliceEventId: number, ptsTime: number): string {
    const buffer: number[] = [];

    buffer.push(0xFC);

    const sectionLengthPos = buffer.length;
    buffer.push(0x30);
    buffer.push(0x00);

    buffer.push(0x00);

    buffer.push(0x00, 0x00, 0x00, 0x00, 0x00);

    buffer.push(0x00);

    const tierAndCmdLengthPos = buffer.length;
    buffer.push(0xFF);
    buffer.push(0xF0);
    buffer.push(0x00);

    buffer.push(0x05);

    const spliceInsertStart = buffer.length;

    // splice_event_id (32 bits)
    buffer.push((spliceEventId >> 24) & 0xFF);
    buffer.push((spliceEventId >> 16) & 0xFF);
    buffer.push((spliceEventId >> 8) & 0xFF);
    buffer.push(spliceEventId & 0xFF);

    buffer.push(0x7F);

    buffer.push(0x4F);

    buffer.push(0xFE | ((ptsTime >> 32) & 0x01));
    buffer.push((ptsTime >> 24) & 0xFF);
    buffer.push((ptsTime >> 16) & 0xFF);
    buffer.push((ptsTime >> 8) & 0xFF);
    buffer.push(ptsTime & 0xFF);

    buffer.push(0x00, 0x01);
    buffer.push(0x00);
    buffer.push(0x00);

    const spliceInsertEnd = buffer.length;
    const spliceCommandLength = spliceInsertEnd - spliceInsertStart;

    buffer.push(0x00, 0x00);

    const sectionLengthWithoutCrc = buffer.length - 3;
    const sectionLength = sectionLengthWithoutCrc + 4;

    buffer[sectionLengthPos] = 0x30 | ((sectionLength >> 8) & 0x0F);
    buffer[sectionLengthPos + 1] = sectionLength & 0xFF;

    buffer[tierAndCmdLengthPos + 1] = 0xF0 | ((spliceCommandLength >> 8) & 0x0F);
    buffer[tierAndCmdLengthPos + 2] = spliceCommandLength & 0xFF;

    const crc = this.calculateCrc32Mpeg2(buffer);
    buffer.push((crc >> 24) & 0xFF);
    buffer.push((crc >> 16) & 0xFF);
    buffer.push((crc >> 8) & 0xFF);
    buffer.push(crc & 0xFF);

    return Buffer.from(new Uint8Array(buffer)).toString('base64');
  }

  private calculateCrc32Mpeg2(data: number[]): number {
    let crc = 0xFFFFFFFF;
    const polynomial = 0x04C11DB7;

    for (const byte of data) {
      crc ^= byte << 24;
      for (let i = 0; i < 8; i += 1) {
        if (crc & 0x80000000) {
          crc = ((crc << 1) ^ polynomial) >>> 0;
        } else {
          crc = (crc << 1) >>> 0;
        }
      }
    }

    return crc >>> 0;
  }

  generateScc(data: string[]): string {
    const signals: string[] = [];

    data.forEach((cuePoint, i) => {
      const cuePointMatches = cuePoint.match(this.cuePointRegExp);

      if (cuePointMatches === null || cuePointMatches.length < 2) {
        throw new EsamXMLError.InvalidCuePoint(`Scc: Invalid cue point: ${cuePoint}`);
      }

      const cuePointSeconds = parseFloat(cuePointMatches[1]);
      const signalId = i + 1;

      // Single signal at the cue point for ad insertion
      signals.push(`  <ResponseSignal acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="${signalId}" signalPointID="${signalId}" action="create">
    <sig:NPTPoint nptPoint="${cuePointSeconds}"/>
    <sig:SCTE35PointDescriptor spliceCommandType="05">
      <sig:SegmentationDescriptorInfo segmentEventId="${signalId}" segmentTypeId="52" upidType="9" upid="${signalId}" segmentNumber="0" segmentsExpected="1"/>
    </sig:SCTE35PointDescriptor>
  </ResponseSignal>
  <ConditioningInfo acquisitionSignalIDRef="${signalId}" startOffset="PT${cuePointSeconds}S" duration="PT0S"/>`);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<SignalProcessingNotification xmlns="urn:cablelabs:iptvservices:esam:xsd:signal:1" xmlns:sig="urn:cablelabs:md:xsd:signaling:3.0" xmlns:common="urn:cablelabs:iptvservices:esam:xsd:common:1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" acquisitionPointIdentity="InsertionESAM">

  <common:BatchInfo batchId="1">
    <common:Source xsi:type="content:MovieType" />
  </common:BatchInfo>

${signals.join('\n\n')}

</SignalProcessingNotification>`;
  }

  async generateMcc(data: string[]): Promise<string> {
    const responses: string[] = [];

    data.forEach((cuePoint, i) => {
      const cuePointMatches = cuePoint.match(this.cuePointRegExp);

      if (cuePointMatches === null || cuePointMatches.length < 2) {
        throw new EsamXMLError.InvalidCuePoint(`Mcc: Invalid cue point: ${cuePoint}`);
      }

      const cuePointSeconds = parseFloat(cuePointMatches[1]);
      const ptsTime = this.secondsToPts(cuePointSeconds);
      const signalId = i + 1;

      const scte35CueOut = this.generateSpliceInsertCueOutBase64(signalId, ptsTime);
      const scte35CueIn = this.generateSpliceInsertCueInBase64(signalId, ptsTime);

      responses.push(`  <ns2:ManifestResponse acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="${signalId}" dataPassThrough="true">
    <ns2:SegmentModify>
      <ns2:FirstSegment>
        <ns2:Tag value="#EXT-OATCLS-SCTE35:${scte35CueOut}" />
        <ns2:Tag value="#EXT-X-CUE-OUT:${this.expectedAdDurationSeconds}" />
        <ns2:Tag value="#EXT-OATCLS-SCTE35:${scte35CueIn}" />
        <ns2:Tag value="#EXT-X-CUE-IN" />
      </ns2:FirstSegment>
    </ns2:SegmentModify>
  </ns2:ManifestResponse>`);
    });

    return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<ns2:ManifestConfirmConditionNotification xmlns:ns2="http://www.cablelabs.com/namespaces/metadata/xsd/confirmation/2" xmlns="http://www.cablelabs.com/namespaces/metadata/xsd/core/2" xmlns:ns3="http://www.cablelabs.com/namespaces/metadata/xsd/signaling/2">

${responses.join('\n\n')}

</ns2:ManifestConfirmConditionNotification>`;
  }
}
