import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

export default function DragCell() {
  return (
    <FontAwesomeIcon icon={faBars} className="cursor-grab" size="2x" />
  );
}
