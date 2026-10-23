import React from 'react';
import Select from 'react-select';
import { Control, Controller } from 'react-hook-form';
import { StringOrValueLabel } from '@components/configurations/misc';
import './css/fieldselect.css';

interface FieldSelectProps {
  label: string;
  name: string;
  values: StringOrValueLabel[];
  control: Control<any>;
  errors: any;
  hideLabel?: boolean;
  containerClassName?: string;
  selectClassName?: string;
  isMulti?: boolean;
  isLight?: boolean;
  errorName?: string;
  onChange?: (e: any) => void;
}

function convertValues(values: StringOrValueLabel[]) {
  if (values.length && typeof values[0] === 'string') {
    return values.map((value) => ({ value, label: value }));
  }
  return values;
}

export default function FieldSelect({
  label,
  name,
  values,
  control,
  errors,
  hideLabel = false,
  isMulti = false,
  isLight = false,
  containerClassName = '',
  selectClassName = '',
  errorName = '',
  onChange = () => {},
}: FieldSelectProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            onChange: onChangeHook, value, ref,
          },
        }: any,
      ) => (
        <div className={`form_field_group ${containerClassName}`}>
          {!hideLabel && (<label className="text-base">{label}</label>)}
          <Select
            styles={{
              control: (styles) => ({
                ...styles,
                backgroundColor: isLight ? '#454545 !important' : '',
              }),
              option: (styles) => ({
                ...styles,
                backgroundColor: isLight ? '#454545 !important' : '',
              }),
            }}
            className={`form_field_select ${selectClassName}`}
            classNamePrefix="form_field_select"
            ref={ref}
            isMulti={isMulti}
            options={convertValues(values)}
            value={typeof value === 'string' ? { value, label: value } : value}
            onChange={(val) => {
              onChange(val);
              onChangeHook(val);
            }}
          />
          {typeof errors?.[errorName || name]?.message === 'string' && (
          <div className="form_field_error">{errors?.[errorName || name]?.message}</div>
          )}
          {(typeof errors?.[errorName || name]?.message !== 'string' && errors?.[errorName || name]) && (
          <div className="form_field_error">
            {errorName || name}
            {' '}
            is required
          </div>
          )}
        </div>
      )}
    />
  );
}
