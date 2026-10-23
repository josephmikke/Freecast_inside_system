import { useMemo } from 'react';
import { EpgTemplate } from '@api/index';
import { EPGTemplateResult } from '@entities/content/epgtemplate';

interface UseSelectEpgTemplatesReturn {
  epgTemplates: { label: string, value: string, weight: number }[];
  epgTemplatesIsFetching: boolean;
}

export default function useSelectEpgTemplates(): UseSelectEpgTemplatesReturn {
  const {
    data: epgTemplatesData,
    error: epgTemplatesError,
    isFetching: epgTemplatesIsFetching,
  } = EpgTemplate.useEpgTemplates();

  return useMemo<UseSelectEpgTemplatesReturn>(
    () => {
      if (!epgTemplatesData?.data?.templates || epgTemplatesError || epgTemplatesIsFetching) {
        return { epgTemplates: [], epgTemplatesIsFetching };
      }
      return {
        epgTemplates: epgTemplatesData
          ?.data?.templates
          ?.filter((epgTemplate: EPGTemplateResult) => epgTemplate.enabled)
          ?.map((epgTemplate: EPGTemplateResult) => ({
            label: epgTemplate.name, value: epgTemplate.id, weight: 0,
          })),
        epgTemplatesIsFetching,
      };
    },
    [epgTemplatesError, epgTemplatesData, epgTemplatesIsFetching],
  );
}
