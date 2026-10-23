import React, { useState, ComponentType } from 'react';
import { Control, Controller } from 'react-hook-form';
import Modal from 'react-modal';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';

const ModalTS = Modal as ComponentType<ReactModal['props']>;

interface FieldSelectMultiWithModalProps {
  label: string,
  name: string,
  values: string[],
  modalContent: any,
  control: Control<any>;
  errors: any,
}

export default function FieldSelectMultiWithModal({
  label,
  name,
  values,
  modalContent,
  control,
  errors,
}: FieldSelectMultiWithModalProps) {
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
        <div className="form_field_group">
          <label>
            {label}
            <div style={{ float: 'right' }} onClick={() => setModalOpen(true)}>
              <FontAwesomeIcon icon={faPen} size="2x" />
            </div>
          </label>
          <Select
            className="form_field_select"
            classNamePrefix="form_field_select"
            ref={ref}
            options={values.map((v) => ({ value: v, label: v }))}
            isMulti
            value={value}
            onChange={(val) => onChange(val)}
          />
          <div className="form_field_error">{errors[name]?.message}</div>
          <ModalTS
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
          >
            {modalContent}
          </ModalTS>
        </div>
      )}
    />
  );
}
