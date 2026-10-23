import React from 'react';
import { Row } from 'react-table';

export type UseColumnProps = {
  onClickTrash: (event: React.MouseEvent<SVGSVGElement, MouseEvent>, row: any) => any;
  onClickEnable: (isChecked: boolean, row: Row<any>) => Promise<void>;
};
