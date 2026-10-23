import {
  checkEntity, checkObject, checkSimpleValue,
} from '@/activityLogger/common/checkers';
import { EPGTemplatePayload, EPGTemplateResult } from '@entities/content/epgtemplate';

function checkTemplateType(old: any, updated: any) {
  if (typeof old === 'object') {
    return old.value !== updated;
  }
  return false;
}

export default function epgTemplatesActivityLogger(
  epgTemplatesBase: EPGTemplateResult,
  epgTemplatesPayload: EPGTemplatePayload,
) {
  const updatedFields = checkEntity(epgTemplatesBase, epgTemplatesPayload, {
    name: checkSimpleValue,
    slug: checkSimpleValue,
    templateType: checkTemplateType,
    mapping: checkObject,
  });

  console.log(updatedFields);
}
