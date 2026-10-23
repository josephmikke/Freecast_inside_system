import { CommonEntityPayload, CommonEntityResult } from '@entities/common';

export type EPGTemplateTemplateType = 'CSV' | 'JSON' | 'XLS / XLSX' | 'XML' | 'XMLTV' | 'GRID';
export type EPGTemplateMapping = {
  [k: string]: string;
};

interface EPGTemplateResult extends CommonEntityResult {
  templateType: EPGTemplateTemplateType;
  mapping: EPGTemplateMapping;
}

interface EPGTemplatePayload extends CommonEntityPayload {
  templateType: EPGTemplateTemplateType;
  mapping: EPGTemplateMapping;
}

export type { EPGTemplateResult, EPGTemplatePayload };
