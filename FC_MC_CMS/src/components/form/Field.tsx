import React from 'react';
import { UseFormRegister } from 'react-hook-form';

interface FieldProps {
  label: string,
  name: string,
  type: string,
  register: UseFormRegister<any>;
  errors: any,
  hideLabel?: boolean,
  inputClassName?: string,
  errorName?: string,
  containerClassName?: string,
  placeholder?: string
  desc?: string
}

export default function Field({
  label,
  name,
  type,
  register,
  errors,
  hideLabel = false,
  inputClassName = '',
  containerClassName = '',
  errorName = '',
  placeholder,
  desc,
}: FieldProps) {
  return (
    <div className={`form_field_group ${containerClassName}`}>
      {!hideLabel && (<label className="text-base">{label}</label>)}
      {desc && <span className="form_field_desc text-gray-light">{desc}</span>}
      <input
        {...register(name)}
        placeholder={placeholder || label}
        type={type}
        className={`text-base ${errors?.[errorName || name] ? 'invalid' : ''} ${inputClassName}`}
      />
      <div className="form_field_error">{errors?.[errorName || name]?.message}</div>
    </div>
  );
}
