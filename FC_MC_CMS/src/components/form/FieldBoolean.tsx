import React from 'react';
import { Control, Controller } from 'react-hook-form';

interface FieldBooleanProps {
  label: string,
  name: string,
  control: Control<any>,
  hideLabel?: boolean
  errors: any,
  containerClassName?: string,
  errorName?: string,
}

export default function FieldBoolean({
  label,
  name,
  control,
  hideLabel = false,
  errors,
  containerClassName = '',
  errorName = '',
}: FieldBooleanProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            onChange, onBlur, value, ref,
          },
        }: any,
      ) => (
        <div className={`form_field_group accent-blue ${containerClassName}`}>
          {!hideLabel && (<label>{label}</label>)}
          <div className="form_field_line">
            <input
              type="radio"
              className={`form_field_input !w-4 !h-4 !pl-0 ${errors?.[errorName || name] ? 'invalid' : ''}`}
              onBlur={onBlur}
              onChange={() => onChange(true)}
              checked={value === true}
              ref={ref}
              id={`${name}_true`}
            />
            <label htmlFor={`${name}_true`}>True</label>
          </div>
          <div
            className="form_field_line"
          >
            <input
              type="radio"
              className={`form_field_input !w-4 !h-4 !pl-0 ${errors?.[errorName || name] ? 'invalid' : ''}`}
              onBlur={onBlur}
              onChange={() => onChange(false)}
              checked={value === false}
              ref={ref}
              id={`${name}_false`}
            />
            <label htmlFor={`${name}_false`}>False</label>
          </div>
          <div className="form_field_error">{errors?.[errorName || name]?.message}</div>
        </div>
      )}
    />
  );
}
