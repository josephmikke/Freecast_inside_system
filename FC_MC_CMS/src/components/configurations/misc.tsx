// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { ComponentType } from 'react';
import Modal from 'react-modal';

const ModalTS = Modal as ComponentType<ReactModal['props']>;

export type StringOrValueLabel = string | { value: string, label: string };

export function getLabel(v: StringOrValueLabel): string {
  if (typeof v === 'string') return v;
  return v.label;
}

export function getValue(v: StringOrValueLabel): string {
  if (typeof v === 'string') return v;
  return v.value;
}

export {
  ModalTS,
};
