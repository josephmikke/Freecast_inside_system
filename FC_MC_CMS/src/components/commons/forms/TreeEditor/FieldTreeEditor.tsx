import React, { useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import Editor from 'react-simple-code-editor';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { toast } from 'react-toastify';
import RowsMapper from '@components/commons/forms/TreeEditor/RowsMapper';
import { highlightWithLineNumbers } from '@components/form/FieldJson';
import filtersSelectStyles from '@components/filtersAndSorters/filtersSelectStyles';

interface FieldTreeEditorProps {
  height?: number;
  containerClassName?: string;
  name: string;
  control: Control<any>;
}

const addTypesOptions = [
  { value: 'string', label: 'String' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
];

function getValue(value: any): object {
  if (typeof value === 'undefined' || !value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  }
  return value;
}

export default function FieldTreeEditor({
  height = 500,
  containerClassName = '',
  name,
  control,
}: FieldTreeEditorProps) {
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [textAreaContent, setTextAreaContent] = useState<string>('{\n\t"property_name": "value"\n}');
  const [addType, setAddType] = useState<'array' | 'string' | 'object'>('string');

  const onChangeType = (type: 'array' | 'string' | 'object') => {
    setAddType(type);
    switch (type) {
      case 'array':
        setTextAreaContent('{\n\t"property_name": ["value1", "value2"]\n}');
        break;
      case 'string':
        setTextAreaContent('{\n\t"property_name": "value"\n}');
        break;
      case 'object':
        setTextAreaContent('{\n\t"property_name": {\n\t\t"property_name": "value"\n\t}\n}');
        break;
      default:
        break;
    }
  };

  const onAdd = (value: any, onChange: any) => {
    try {
      const parsed = JSON.parse(textAreaContent);
      onChange({ ...value, ...parsed });
      setAddOpen(false);
      onChangeType('string');
    } catch (error) {
      toast.error('Invalid JSON');
    }
  };

  const onChangeInput = (value: any, onChange: any) => {
    onChange({ ...value });
  };

  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            value, onChange,
          },
        }: any,
      ) => (
        <div style={{ height }} className={`w-full p-2 rounded bg-gray-dark overflow-y-scroll ${containerClassName}`}>
          <DndProvider backend={HTML5Backend}>
            <RowsMapper
              onChange={(_value: any) => onChangeInput(_value, onChange)}
              depthLevel={0}
              path=""
              currentObj={getValue(value)}
              obj={getValue(value)}
            />
          </DndProvider>
          <div className="rounded-xl  w-full p-2 bg-gray">
            {!addOpen && (
            <FontAwesomeIcon
              onClick={() => setAddOpen(true)}
              className="cursor-pointer"
              icon={faPlusCircle}
            />
            )}
            {addOpen && (
            <div>
              <Select
                styles={{
                  ...filtersSelectStyles,
                }}
                value={addTypesOptions.find((option) => option.value === addType)}
                onChange={(option: any) => onChangeType(option.value)}
                options={addTypesOptions}
              />
              <Editor
                value={textAreaContent}
                onValueChange={(code) => setTextAreaContent(code)}
                highlight={(code) => highlightWithLineNumbers(code)}
                padding={10}
                textareaId="codeArea"
                className="editor mt-3 !overflow-y-scroll !border-none "
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  backgroundColor: '#252525',
                  borderRadius: 20,
                  height: 150,
                }}
              />
              <button type="button" onClick={() => onAdd(value, onChange)} className="mt-3 rounded-xl bg-green w-full py-2">
                Add
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    />
  );
}
