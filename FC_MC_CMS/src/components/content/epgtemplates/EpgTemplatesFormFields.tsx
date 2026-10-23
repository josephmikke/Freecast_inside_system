import React, { useEffect, useState } from 'react';
import Editor from 'react-simple-code-editor';
import {
  Control, UseFormGetValues, UseFormRegister, UseFormWatch,
} from 'react-hook-form';
import { Field, FieldJson, FieldSelect } from '@components/form';
import DoubleChoiceField from '@components/commons/forms/DoubleChoiceField';
import FieldTreeEditor from '@components/commons/forms/TreeEditor/FieldTreeEditor';
import { highlightWithLineNumbers } from '@components/form/FieldJson';
import '@components/form/css/fieldjson.css';
import exempleMappingByType from '@components/content/epgtemplates/exempleMappingByType';

const templateTypes = [
  { value: 'CSV', label: 'CSV' },
  { value: 'JSON', label: 'JSON' },
  { value: 'XLS / XLSX', label: 'XLS / XLSX' },
  { value: 'XML', label: 'XML' },
  { value: 'XMLTV', label: 'XMLTV' },
  { value: 'GRID', label: 'GRID' },
];

interface EpgTemplatesFormFieldsProps {
  register: UseFormRegister<any>;
  errors: any;
  control: Control<any>;
  getValues: UseFormGetValues<any>;
  watch: UseFormWatch<any>;
}
export default function EpgTemplatesFormFields({
  register,
  errors,
  control,
  watch,
  getValues,
}: EpgTemplatesFormFieldsProps) {
  const [codeOrTree, setCodeOrTree] = useState<'code' | 'tree'>('code');
  const [templateMappingExample, setTemplateMappingExample] = useState<string>('');

  const updateExampleMapping = (type: string) => {
    if (!type) {
      setTemplateMappingExample('Please select a template type.');
    } else {
      const exempleMapping = exempleMappingByType?.[
        type as keyof typeof exempleMappingByType
      ] ?? exempleMappingByType.default;
      setTemplateMappingExample(exempleMapping);
    }
  };

  useEffect(() => {
    const { templateType } = getValues();
    const type = templateType?.value ?? templateType;
    updateExampleMapping(type);
  }, []);

  const onWatch = (data: any) => {
    const type = data?.templateType?.value ?? data?.templateType;
    updateExampleMapping(type);
  };

  useEffect(() => {
    watch((data) => onWatch(data));
  }, [watch]);

  return (
    <div className="flex flex-row">
      <div className="flex flex-col">
        <Field
          inputClassName="!bg-gray-dark"
          label="Template Name"
          name="name"
          type="string"
          register={register}
          errors={errors}
        />
        <Field
          inputClassName="!bg-gray-dark"
          label="Template Slug"
          name="extId"
          type="string"
          register={register}
          errors={errors}
        />
        <FieldSelect
          containerClassName="z-50"
          label="Template Type"
          name="templateType"
          values={templateTypes}
          control={control}
          errors={errors}
        />
        <label className="mt-3">Example Mapping</label>
        <div className="rounded-xl">
          <div style={{ height: 300, width: '100%' }} className="rounded-xl !overflow-y-scroll ">
            <Editor
              value={templateMappingExample}
              readOnly
              highlight={(code) => highlightWithLineNumbers(code)}
              padding={10}
              textareaId="codeArea"
              className="editor z-40 !border-none"
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 14,
                backgroundColor: '#252525',
                borderRadius: 20,
              }}
              onValueChange={() => {}}
            />
          </div>
        </div>

      </div>
      <div className="flex flex-col w-[800px] ml-8">
        <DoubleChoiceField
          selected={codeOrTree}
          label="Template Mapping"
          first={{ label: 'Code', value: 'code' }}
          second={{ label: 'Tree', value: 'tree' }}
          onSelect={(v) => setCodeOrTree(v as 'code' | 'tree')}
        />
        <p className="mt-3 text-sm text-gray-light italic">Select an option for how you display the mapped fields. </p>
        {codeOrTree === 'code' && (
          <FieldJson
            height={490}
            width={600}
            containerClassName="!mt-3"
            name="mapping"
            control={control}
            errors={errors}
          />
        )}
        {codeOrTree === 'tree' && (
          <FieldTreeEditor
            control={control}
            height={490}
            containerClassName="!mt-3"
            name="mapping"
          />
        )}
      </div>
    </div>
  );
}
