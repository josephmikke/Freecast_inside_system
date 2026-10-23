import EsamXMLAdaptor, { EsamXMLError } from '../EsamXMLAdaptor';

const esamXMLAdaptor = new EsamXMLAdaptor();

describe('ESAM XML Adaptor - generateScc', () => {
  it('Should generate Scc XML', () => {
    expect(esamXMLAdaptor.generateScc(['123.00', '644.556'])).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<SignalProcessingNotification xmlns="urn:cablelabs:iptvservices:esam:xsd:signal:1" xmlns:sig="urn:cablelabs:md:xsd:signaling:3.0" xmlns:common="urn:cablelabs:iptvservices:esam:xsd:common:1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" acquisitionPointIdentity="InsertionESAM">

  <common:BatchInfo batchId="1">
    <common:Source xsi:type="content:MovieType" />
  </common:BatchInfo>

  <ResponseSignal acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="1" signalPointID="1" action="create">
    <sig:NPTPoint nptPoint="123"/>
    <sig:SCTE35PointDescriptor spliceCommandType="05">
      <sig:SegmentationDescriptorInfo segmentEventId="1" segmentTypeId="52" upidType="9" upid="1" segmentNumber="0" segmentsExpected="1"/>
    </sig:SCTE35PointDescriptor>
  </ResponseSignal>
  <ConditioningInfo acquisitionSignalIDRef="1" startOffset="PT123S" duration="PT0S"/>

  <ResponseSignal acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="2" signalPointID="2" action="create">
    <sig:NPTPoint nptPoint="644.556"/>
    <sig:SCTE35PointDescriptor spliceCommandType="05">
      <sig:SegmentationDescriptorInfo segmentEventId="2" segmentTypeId="52" upidType="9" upid="2" segmentNumber="0" segmentsExpected="1"/>
    </sig:SCTE35PointDescriptor>
  </ResponseSignal>
  <ConditioningInfo acquisitionSignalIDRef="2" startOffset="PT644.556S" duration="PT0S"/>

</SignalProcessingNotification>`);
  });

  it('Should throw error on invalid cuePoint', () => {
    expect(() => esamXMLAdaptor.generateScc(['234', 'abcd']))
      .toThrowError(EsamXMLError.InvalidCuePoint);
  });
});

describe('ESAM XML Adaptor - generateMcc', () => {
  it('Should generate Mcc XML', async () => {
    expect(await esamXMLAdaptor.generateMcc(['23', '655.00', '10023.000'])).toEqual(`<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<ns2:ManifestConfirmConditionNotification xmlns:ns2="http://www.cablelabs.com/namespaces/metadata/xsd/confirmation/2" xmlns="http://www.cablelabs.com/namespaces/metadata/xsd/core/2" xmlns:ns3="http://www.cablelabs.com/namespaces/metadata/xsd/signaling/2">

  <ns2:ManifestResponse acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="1" dataPassThrough="true">
    <ns2:SegmentModify>
      <ns2:FirstSegment>
        <ns2:Tag value="#EXT-OATCLS-SCTE35:/DAlAAAAAAAAAP/wFAUAAAABf+/+AB+V8P4AAAAAAAEAAAAASlBmfw==" />
        <ns2:Tag value="#EXT-X-CUE-OUT:60" />
        <ns2:Tag value="#EXT-OATCLS-SCTE35:/DAgAAAAAAAAAP/wDwUAAAABf0/+AB+V8AABAAAAAHcHLz8=" />
        <ns2:Tag value="#EXT-X-CUE-IN" />
      </ns2:FirstSegment>
    </ns2:SegmentModify>
  </ns2:ManifestResponse>

  <ns2:ManifestResponse acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="2" dataPassThrough="true">
    <ns2:SegmentModify>
      <ns2:FirstSegment>
        <ns2:Tag value="#EXT-OATCLS-SCTE35:/DAlAAAAAAAAAP/wFAUAAAACf+/+A4OBcP4AAAAAAAEAAAAA91vaWw==" />
        <ns2:Tag value="#EXT-X-CUE-OUT:60" />
        <ns2:Tag value="#EXT-OATCLS-SCTE35:/DAgAAAAAAAAAP/wDwUAAAACf0/+A4OBcAABAAAAAEFP7xI=" />
        <ns2:Tag value="#EXT-X-CUE-IN" />
      </ns2:FirstSegment>
    </ns2:SegmentModify>
  </ns2:ManifestResponse>

  <ns2:ManifestResponse acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="3" dataPassThrough="true">
    <ns2:SegmentModify>
      <ns2:FirstSegment>
        <ns2:Tag value="#EXT-OATCLS-SCTE35:/DAlAAAAAAAAAP/wFAUAAAADf+/+NcR+8P4AAAAAAAEAAAAA6FFQ8A==" />
        <ns2:Tag value="#EXT-X-CUE-OUT:60" />
        <ns2:Tag value="#EXT-OATCLS-SCTE35:/DAgAAAAAAAAAP/wDwUAAAADf0/+NcR+8AABAAAAAIW6xSk=" />
        <ns2:Tag value="#EXT-X-CUE-IN" />
      </ns2:FirstSegment>
    </ns2:SegmentModify>
  </ns2:ManifestResponse>

</ns2:ManifestConfirmConditionNotification>`);
  });

  // generateMcc is async, so it rejects rather than throwing synchronously; the sync form
  // leaves the rejection unhandled and takes the Jest worker down with it.
  it('Should throw error on invalid cuePoint', async () => {
    await expect(esamXMLAdaptor.generateMcc(['234', 'abcd']))
      .rejects.toThrow(EsamXMLError.InvalidCuePoint);
  });
});
