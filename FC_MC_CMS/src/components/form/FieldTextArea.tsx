import React from 'react';
import { UseFormRegister } from 'react-hook-form';

interface FieldTextareaProps {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  errors: any;
  hideLabel?: boolean;
  containerClassName?: string;
  textAreaClassName?: string;
  rows?: number;
  errorName?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export default function FieldTextarea({
  label,
  name,
  register,
  errors,
  hideLabel = false,
  containerClassName = '',
  textAreaClassName = '',
  errorName = '',
  onChange = () => {},
  rows = 4,
}: FieldTextareaProps) {
  const { onChange: onChangeHook, ...rest } = register(name);
  return (
    <div className={`form_field_group ${containerClassName}`}>
      {!hideLabel && (<label>{label}</label>)}
      <textarea
        {...rest}
        onChange={(e) => {
          onChangeHook(e);
          onChange(e);
        }}
        rows={rows}
        placeholder={label}
        className={`form_field_input ${errors?.[errorName || name] ? 'invalid' : ''} ${textAreaClassName}`}
      />
      <div className="form_field_error">{errors?.[errorName || name]?.message}</div>
    </div>
  );
}
