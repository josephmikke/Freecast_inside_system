import { Control, Controller, UseFormSetValue } from 'react-hook-form';
import React from 'react';
import FieldRadioRuleTypeDetail from '@components/configurations/geoip/fields/FieldRadioRuleTypeDetail';
import { GeoIPRulePayload, GeoIPRuleRuleType } from '@entities/configurations/geoiprule';

interface FieldRadioRuleTypeProps {
  label: string,
  name: string,
  desc: string,
  control: Control<any>;
  errors: any,
  setValue: UseFormSetValue<GeoIPRulePayload>;
}

export default function FieldRadioRuleType({
  label,
  name,
  desc,
  control,
  errors,
  setValue,
}: FieldRadioRuleTypeProps) {
  const values: GeoIPRuleRuleType[] = ['SUBNET', 'SPECIFIC_IP', 'LOCATION', 'USER_AGENT'];

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
              <div className="flex mb-3 !pl-0" key={v}>
                <div className="w-48">
                  <input
                    type="radio"
                    className={`!w-4 !h-4 accent-blue ${errors[name] ? 'invalid' : ''}`}
                    onBlur={onBlur}
                    onChange={() => onChange(v)}
                    checked={value === v}
                    ref={ref}
                    id={`${name}_${idx}`}
                  />
                  <span className="form_field_radio" />
                  <label className="ml-1" htmlFor={`${name}_${idx}`}>{v}</label>
                </div>
                <div className="w-96">
                  {v === value && (
                    <FieldRadioRuleTypeDetail
                      name="value"
                      setValue={setValue}
                      rule={value}
                      control={control}
                      errors={errors}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="form_field_error">{errors[name]?.message}</div>
        </div>
      )}
    />
  );
}
