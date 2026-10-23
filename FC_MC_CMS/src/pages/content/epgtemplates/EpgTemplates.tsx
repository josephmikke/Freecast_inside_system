import React from 'react';
import EntityModalFormTablePage from '@pages/common/EntityModalFormTablePage';
import { EpgTemplate } from '@api/index';
import { Content } from '@components/index';

interface EpgTemplateData {
  name: string;
  id: string;
  extId: string;
  createdAt: string;
  updatedAt: string;
  templateType: any;
}

interface EpgTemplatesPageProps {
  action: 'add' | 'edit' | 'list';
}

export default function EpgTemplatesPage({ action }: EpgTemplatesPageProps) {
  return (
    <EntityModalFormTablePage<EpgTemplateData>
      action={action}
      useData={EpgTemplate.useEpgTemplates}
      title="EPG Templates"
      desc="List of EpgTemplates that can be used across most areas of the CMS."
      Form={Content.EpgTemplateForm}
      Table={Content.EpgTemplatesTable}
      dataFieldName="templates"
      mapData={(data) => ({
        ...data,
        templateType: { value: data.templateType, label: data.templateType },
      })}
    />
  );
}
