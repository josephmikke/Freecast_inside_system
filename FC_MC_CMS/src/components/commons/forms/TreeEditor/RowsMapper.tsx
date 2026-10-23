import React from 'react';
// eslint-disable-next-line import/no-cycle
import Row from '@components/commons/forms/TreeEditor/Row';

interface RowsMapperProps {
  currentObj: any;
  onChange: any;
  depthLevel: number;
  path: string;
  obj: any;
  dropRef?: any;
}

export default function RowsMapper({
  obj,
  currentObj,
  onChange,
  depthLevel,
  path,
  dropRef,
}: RowsMapperProps) {
  return (
    <div ref={dropRef}>
      {Object.keys(currentObj).map((keyName, index) => (
        <Row
          key={keyName}
          keyName={keyName}
          index={index}
          obj={obj}
          depthLevel={depthLevel}
          onChange={onChange}
          currentObj={currentObj}
          path={path}
        />
      ))}
    </div>
  );
}
