import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { getLabel, getValue, StringOrValueLabel } from '@components/configurations/misc';

interface FieldRadioProps {
  label: string;
  name: string;
  desc?: string;
  values: StringOrValueLabel[];
  control: Control<any>;
  errors: any;
  containerClassName?: string;
  lineOptionsClassName?: string;
  valuesContainerClassName?: string;
}

export default function FieldRadio({
  label,
  name,
  desc,
  values,
  control,
  errors,
  containerClassName = '',
  lineOptionsClassName = '',
  valuesContainerClassName = '',
}: FieldRadioProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            onChange, onBlur, onFocus, value,
          },
        }: any,
      ) => (
        <div className={`form_field_group ${containerClassName} `}>
          <label>{label}</label>
          {desc && <span className="form_field_desc text-gray-light">{desc}</span>}
          <div className={`form_field_values_flex flex-col ${valuesContainerClassName}`}>
            {values.map((v, idx) => (
              <div className={`form_field_line accent-blue !pl-0 ${lineOptionsClassName}`} key={getValue(v)}>
                <input
                  type="radio"
                  onBlur={onBlur}
                  className="!w-4 !h-4"
                  onFocus={onFocus}
                  onChange={() => onChange(getValue(v))}
                  checked={getValue(v) === value}
                  id={`${getValue(v)}_${idx}`}
                />
                <label htmlFor={`${getValue(v)}_${idx}`}>{getLabel(v)}</label>
              </div>
            ))}
          </div>
          <div className="form_field_error">{errors[name]?.message}</div>
        </div>
      )}
    />
  );
}
