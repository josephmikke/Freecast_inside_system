import React, { useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight, languages } from 'prismjs/components/prism-core';
import './css/fieldjson.css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-dark.css';

interface FieldJsonProps {
  label?: string;
  name: string;
  control: Control<any>;
  errors: any;
  containerClassName?: string;
  isDark?: boolean;
  readOnly?: boolean;
  height?: number;
  width?: number | string;
  zIndex?: string;
}

export function highlightWithLineNumbers(input: string) {
  return highlight(input, languages.js, 'json')
    .split('\n')
    .map((line: string, i: number) => `<span class='editorLineNumber'>${i + 1}</span>${line}`)
    .join('\n');
}

export default function FieldJson({
  label,
  name,
  control,
  errors,
  containerClassName = '',
  isDark = false,
  height = 300,
  width = '100%',
  readOnly = false,
  zIndex = '!z-40',
}: FieldJsonProps) {
  const [error, setError] = useState<boolean>(false);
  const handleOnChange = (code: string, onChange: (code: string) => void) => {
    try {
      onChange(JSON.stringify(JSON.parse(String(code)), undefined, 4));
      setError(false);
    } catch (_error) {
      setError(true);
      onChange(String(code));
    }
  };

  const getValue = (value: any) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, undefined, 4);
    }
    if (typeof value === 'undefined') {
      return '{}';
    }
    return value;
  };

  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            onChange, value, ref, onBlur, onFocus,
          },
        }: any,
      ) => (
        <div className={`form_field_group ${containerClassName}`}>
          {label && <label>{label}</label>}
          <div className="rounded-xl">
            <div style={{ height, width, flex: 1 }} className="overflow-y-scroll">
              <Editor
                ref={ref}
                value={getValue(value)}
                onValueChange={(code) => handleOnChange(code, onChange)}
                highlight={(code) => highlightWithLineNumbers(code)}
                padding={10}
                onBlur={onBlur}
                onFocus={onFocus}
                readOnly={readOnly}
                textareaId="codeArea"
                className={`editor ${zIndex} !border-none ${error ? '!border-red' : ''}`}
                style={{
                  minHeight: '100%',
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  backgroundColor: isDark ? '#454545' : '#252525',
                  borderRadius: 20,
                }}
              />
            </div>
          </div>
          {error && <div><span className="text-red">There is an error on the JSON.</span></div>}
          <div className="form_field_error">{errors[name]?.message}</div>
        </div>
      )}
    />
  );
}
