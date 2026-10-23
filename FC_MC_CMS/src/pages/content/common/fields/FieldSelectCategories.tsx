import React, { useState } from 'react';
import { Control, Controller, UseFormGetValues } from 'react-hook-form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import Modal from 'react-modal';
import modalStyles from '@/styles/modalStyles';

interface FieldSelectCategoriesProps {
  label: string;
  name: string;
  values: { label: string; weight: number; value: string }[];
  modalContent: any;
  control: Control<any>;
  errors: any;
  isLight?: boolean;
  getValues?: UseFormGetValues<any>;
  containerClassName?: string;
}

function getWeightForLabel(_label: string, _weight: number, _lcn: number): string {
  let weight = '';
  let label = '';

  if (parseInt(String(_weight), 10) === parseInt(String(_lcn), 10) || !_weight) {
    weight = 'AUTO';
  } else {
    weight = _weight.toString();
  }

  if (typeof _lcn === 'undefined') {
    weight = _weight.toString();
  }

  label = _label.split('(')[0].trim();

  return `${label} (Wt : ${weight})`;
}

function getValuesWithWeightOnLabel(values: any[], lcn: number) {
  return values?.map((val) => ({
    ...val,
    label: getWeightForLabel(val.label, parseInt(val.weight, 10), lcn),
  }));
}

export default function FieldSelectCategories({
  label,
  name,
  values,
  modalContent,
  control,
  errors,
  isLight = false,
  getValues,
  containerClassName = '',
}: FieldSelectCategoriesProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={(
        {
          field: {
            onChange, value, ref,
          },
        }: any,
      ) => (
        <div className={`${containerClassName} form_field_group`}>
          <label>
            {label}
            <div style={{ float: 'right' }} className="cursor-pointer" onClick={() => setModalOpen(true)}>
              <FontAwesomeIcon icon={faPen} size="1x" />
            </div>
          </label>
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
            className="form_field_select"
            classNamePrefix="form_field_select"
            ref={ref}
            options={values}
            isMulti
            value={getValuesWithWeightOnLabel(value, typeof getValues !== 'undefined' ? getValues?.('lcn') : undefined)}
            onChange={(val) => onChange(val)}
          />
          <div className="form_field_error">{errors[name]?.message}</div>
          <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            ariaHideApp={false}
            style={modalStyles}
          >
            {modalContent}
          </Modal>
        </div>
      )}
    />
  );
}
