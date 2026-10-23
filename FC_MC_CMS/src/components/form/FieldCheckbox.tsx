import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { getLabel, getValue, StringOrValueLabel } from '@components/configurations/misc';

interface FieldCheckboxProps {
  label: string;
  name: string;
  values: StringOrValueLabel[];
  control: Control<any>;
  errors: any;
  errorName?: string;
  containerClassName?: string;
  lineOptionsClassName?: string;
  valuesContainerClassName?: string;
}

function isChecked(
  relationsEntities: any[],
  v: StringOrValueLabel,
): boolean {
  if (!relationsEntities) return false;
  return relationsEntities.some((relation: any) => getValue(relation) === getValue(v));
}

function onHandleChange(
  relations: StringOrValueLabel[],
  current: StringOrValueLabel,
  onChange: (args: StringOrValueLabel[]) => void,
) {
  if (Array.isArray(relations)) {
    const relationsIncludesThis = isChecked(relations, current);

    if (relationsIncludesThis) {
      onChange(relations.filter(
        (relation: StringOrValueLabel) => {
          if (typeof relation === 'string') {
            return relation !== current;
          }
          return getValue(relation) !== getValue(current);
        },
      ));
    } else {
      onChange([...relations, current]);
    }
  } else {
    onChange([current]);
  }
}

export default function FieldCheckbox({
  label,
  name,
  values,
  control,
  errors,
  errorName = '',
  containerClassName = '',
  valuesContainerClassName = '',
  lineOptionsClassName = '',
}: FieldCheckboxProps) {
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
        <div className={`form_field_group ${containerClassName}`}>
          <label>{label}</label>
          <div className={`form_field_values_flex ${valuesContainerClassName}`}>
            {values?.map((v, idx) => (
              <div
                className={`form_field_line ${lineOptionsClassName}`}
                key={getValue(v)}
              >
                <input
                  onChange={() => onHandleChange(value, v, onChange)}
                  type="checkbox"
                  className={`${errors?.[errorName || name] ? 'invalid' : ''} accent-blue !w-4 !h-4!rounded-xl`}
                  onBlur={onBlur}
                  checked={isChecked(value, v)}
                  ref={ref}
                  id={`${getValue(v)}_${idx}`}
                />
                <label htmlFor={`${getValue(v)}_${idx}`}>{getLabel(v)}</label>
              </div>
            ))}
          </div>
          <div className="form_field_error">{errors?.[errorName || name]?.message}</div>
        </div>
      )}
    />
  );
}
