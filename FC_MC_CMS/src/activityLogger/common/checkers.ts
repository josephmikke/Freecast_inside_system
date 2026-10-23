import { diff } from 'deep-object-diff';

export function checkArray(oldArray: any[], newArray: any[]):boolean {
  if (oldArray === null && newArray === null) {
    return false;
  }
  if (typeof oldArray === 'undefined' && typeof newArray === 'undefined') {
    return false;
  }

  if ((oldArray === null && newArray !== null) || (oldArray !== null && newArray === null)) {
    return true;
  }
  if (oldArray?.length !== newArray?.length) {
    return true;
  }

  const oldArrayMapped = oldArray?.map((item) => item.value ?? item);
  const newArrayMapped = newArray?.map((item) => item.value ?? item);

  return oldArrayMapped.some((item) => !newArrayMapped.includes(item));
}

export function checkArraySet(oldArray: any[], newArray: any[]): boolean {
  if (oldArray === null && newArray === null) {
    return false;
  }
  if (typeof oldArray === 'undefined' && typeof newArray === 'undefined') {
    return false;
  }

  if ((oldArray === null && newArray !== null) || (oldArray !== null && newArray === null)) {
    return true;
  }

  // @ts-ignore
  const oldArrayMapped = [...new Set(oldArray?.map((item) => String(item.value ?? item)))];
  // @ts-ignore
  const newArrayMapped = [...new Set(newArray?.map((item) => String(item.value ?? item)))];

  if (oldArrayMapped?.length !== newArrayMapped?.length) {
    return true;
  }

  return oldArrayMapped.some((item) => !newArrayMapped.includes(item));
}

export function checkArrayToString(oldArray: any[], newArray: any[]):boolean {
  if (oldArray === null && newArray === null) {
    return false;
  }
  if (typeof oldArray === 'undefined' && typeof newArray === 'undefined') {
    return false;
  }

  if ((oldArray === null && newArray !== null) || (oldArray !== null && newArray === null)) {
    return true;
  }
  if (oldArray?.length !== newArray?.length) {
    return true;
  }

  const oldArrayMapped = oldArray?.map((item) => String(item.value ?? item));
  const newArrayMapped = newArray?.map((item) => String(item.value ?? item));

  return oldArrayMapped.some((item) => !newArrayMapped.includes(item));
}

export function checkObject(oldObj: any, newObj: any): boolean {
  if ((oldObj === null && newObj !== null) || (oldObj !== null && newObj === null)) {
    return true;
  }

  const diffBetweenObjects = diff(oldObj, newObj);
  return Object.keys(diffBetweenObjects).length > 0;
}

export function checkSimpleValue(oldValue: any, newValue: any): boolean {
  return oldValue !== newValue;
}

export function checkSimpleValueParseInt(oldValue: any, newValue: any): boolean {
  return parseInt(oldValue.toString(), 10) !== parseInt(newValue.toString(), 10);
}

export function checkPayloadIsDefined(oldValue: any, newValue: any): boolean {
  return typeof newValue !== 'undefined';
}

export function checkCategories(old: any[], updated: any[]): boolean {
  if (old.length !== updated.length) {
    return true;
  }

  let isThereADiff = false;

  old.forEach((oldCat: any, index: number) => {
    const oldWeight = parseInt(oldCat.weight, 10);
    const updatedWeight = parseInt(updated[index].weight, 10);
    isThereADiff = oldCat.value !== updated[index].id || oldWeight !== updatedWeight;
  });

  return isThereADiff;
}

export function checkValueLabel(old: any, updated: any) {
  if (typeof old === 'object') {
    return old.value !== updated;
  }
  return false;
}

interface CheckEntityOptions {
  [key: string]: (oldValue: any, newValue: any) => boolean;
}

export function checkStreams(
  streamBase: any,
  streamPayload: any,
) {
  if (streamBase.length !== streamPayload.length) {
    return true;
  }

  let isThereADiff = false;

  streamBase.forEach((oldStream: any, index: number) => {
    const newStream = streamPayload[index];
    if (!isThereADiff) {
      isThereADiff = oldStream.name !== newStream.name
        || oldStream.data !== newStream.data
        || oldStream.daiParams !== newStream.daiParams
        || oldStream.enabled !== newStream.enabled
        || oldStream.type?.value !== newStream.type
        || oldStream.format?.value !== newStream.format;
    }
  });

  return isThereADiff;
}

export function checkEntity(oldEntity: any, newEntity: any, options: CheckEntityOptions): string[] {
  return Object
    .keys(options)
    .filter((field: any) => {
      const checker = options[field];
      return checker(
        oldEntity[field],
        newEntity[field],
      );
    });
}
