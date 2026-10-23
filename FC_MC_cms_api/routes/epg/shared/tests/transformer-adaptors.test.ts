import TransformerAdaptor from '../TransformerAdaptor';

describe('Transformer Adaptor - EPG', () => {
  const transformerAdaptor = new TransformerAdaptor();

  it('should transform the duration from minutes to seconds', async () => {
    const durationFormat = 'minutes';
    const duration = '120';

    const resultDuration = transformerAdaptor.transformDuration({ durationFormat, duration });

    const expectedResult = '7200';

    expect(resultDuration).toEqual(expectedResult);
  });

  it('should transform the duration from hours to seconds', async () => {
    const durationFormat = 'hours';
    const duration = '2';

    const resultDuration = transformerAdaptor.transformDuration({ durationFormat, duration });

    const expectedResult = '7200';

    expect(resultDuration).toEqual(expectedResult);
  });

  it('should transform the duration from hours to seconds', async () => {
    const durationFormat = 'hours';
    const duration = '2';

    const resultDuration = transformerAdaptor.transformDuration({ durationFormat, duration });

    const expectedResult = '7200';

    expect(resultDuration).toEqual(expectedResult);
  });

  it('should create duration from startTime and endTime', async () => {
    const startTime = '2022-11-30T11:59:59Z';
    const endTime = '2022-11-30T13:59:59Z';

    const resultDuration = transformerAdaptor.transformDuration({ durationFormat: '', startTime, endTime });

    const expectedResult = '7200';

    expect(resultDuration).toEqual(expectedResult);
  });

  it('should transform duration from datetime_format to seconds', async () => {
    const durationFormat = 'datetime_format';
    const duration = '1:30:00';

    const resultDuration = transformerAdaptor.transformDuration({ durationFormat, duration });

    const expectedResult = '5400';

    expect(resultDuration).toEqual(expectedResult);
  });

  it('should concatenate the date and time', async () => {
    const date = '2022-11-30';
    const time = '11:59:59';
    const dateFormat = '%Y-%m-%d';
    const timeFormat = '%H:%M:%S';

    const resultDuration = transformerAdaptor.concatDatetime({
      date, time, dateFormat, timeFormat,
    });

    const expectedResult = '2022-11-30T11:59:59Z';

    expect(resultDuration).toEqual(expectedResult);
  });

  it('should format Date according to mapping', async () => {
    const date = '2022-11-30 11:59:59';
    const dateFormat = '%Y-%m-%d %H:%M:%S';

    const resultDuration = transformerAdaptor.formatDatetime(date, dateFormat);

    const expectedResult = '2022-11-30T11:59:59Z';

    expect(resultDuration).toEqual(expectedResult);
  });

  it('should format Date with %z identifier', async () => {
    const date = '20230510152415 +0000';
    const dateWithOffset = '20230510152415 +0400';
    const dateFormat = '%Y%m%d%H%M%S %z';

    const resultDuration = transformerAdaptor.formatDatetime(date, dateFormat);
    const resultDurationWithOffset = transformerAdaptor.formatDatetime(dateWithOffset, dateFormat);

    const expectedResult = '2023-05-10T15:24:15Z';
    const expectedResultWithOffset = '2023-05-10T19:24:15Z';

    expect(resultDuration).toEqual(expectedResult);
    expect(resultDurationWithOffset).toEqual(expectedResultWithOffset);
  });
});
