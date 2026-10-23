import { Control, Controller, UseFormRegister } from 'react-hook-form';
import React from 'react';
import FieldIngestionScheduleDetail from '@components/content/channels/fields/FieldIngestionScheduleDetail';

interface FieldIngestionScheduleProps {
  label: string;
  name: string;
  desc: string;
  register: UseFormRegister<any>;
  control: Control<any>;
  errors: any;
  errorName?: string;
}

export default function FieldIngestionSchedule({
  label,
  name,
  desc,
  register,
  control,
  errors,
  errorName = '',
}: FieldIngestionScheduleProps) {
  const values = ['HOURLY', 'DAILY', 'WEEKLY'];

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
        <div className="form_field_group">
          <label>{label}</label>
          {desc && <span className="form_field_desc">{desc}</span>}
          <div className="form_field_values_flex">
            {values.map((v, idx) => (
              <div className="flex mb-3 !pl-0 relative" key={v}>
                <div className="w-32">
                  <input
                    type="radio"
                    className={`!w-4 !h-4 accent-blue ${errors?.[errorName || name] ? 'invalid' : ''}`}
                    onBlur={onBlur}
                    onChange={() => onChange({ type: v })}
                    checked={value && v === value.type}
                    ref={ref}
                    id={`${name}_${idx}`}
                  />
                  <span className="form_field_radio" />
                  <label className="ml-1" htmlFor={`${name}_${idx}`}>{v}</label>
                </div>
                <div className="w-96">
                  {value && v === value.type && (
                    <FieldIngestionScheduleDetail
                      selected={value}
                      register={register}
                      control={control}
                      errors={errors}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="form_field_error">{errors?.[errorName || name] ? 'Ingestion schedule required' : ''}</div>
        </div>
      )}
    />
  );
}
