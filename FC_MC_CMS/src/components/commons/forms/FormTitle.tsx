import React from 'react';

interface FormTitleProps {
  action: 'add' | 'edit';
  title: string;
}

export default function FormTitle({ action, title }: FormTitleProps) {
  return (
    <h3 className="text-2xl">
      {action.charAt(0).toUpperCase() + action.slice(1)}
      {' '}
      {title}
    </h3>
  );
}
