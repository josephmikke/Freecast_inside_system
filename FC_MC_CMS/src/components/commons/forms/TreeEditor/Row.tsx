import React, { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faBars, faChevronDown, faChevronRight, faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { useDrag, useDrop } from 'react-dnd';
// eslint-disable-next-line import/no-cycle
import RowsMapper from '@components/commons/forms/TreeEditor/RowsMapper';

interface RowProps {
  currentObj: any;
  depthLevel: number;
  keyName: string;
  onChange: any;
  obj: any;
  path: string;
  index: number;
}

function goBackOneDepthLevel(obj: any, key: string) {
  const keysFromPath = key.split('.');
  const newObj: any = {};

  Object.keys(obj).forEach((currentKey) => {
    if (currentKey === keysFromPath[0]) {
      if (keysFromPath.length === 2) {
        const tmp = obj[currentKey][keysFromPath[1]];
        // eslint-disable-next-line no-param-reassign
        delete obj[currentKey][keysFromPath[1]];
        newObj[currentKey] = obj[currentKey];
        newObj[keysFromPath[1]] = tmp;
      } else if (typeof obj[keysFromPath[0]][keysFromPath[1]] === 'object' && obj[keysFromPath[0]][keysFromPath[1]] !== null) {
        newObj[currentKey] = goBackOneDepthLevel(obj[keysFromPath[0]], keysFromPath.slice(1).join('.'));
      } else {
        newObj[keysFromPath[1]] = obj[keysFromPath[0]][keysFromPath[1]];
        // eslint-disable-next-line no-param-reassign
        delete obj[keysFromPath[0]][keysFromPath[1]];
        newObj[keysFromPath[0]] = obj[keysFromPath[0]];
      }
    } else {
      newObj[currentKey] = obj[currentKey];
    }
  });

  return newObj;
}

export default function Row({
  currentObj,
  onChange,
  obj,
  depthLevel,
  keyName,
  path,
  index,
}: RowProps) {
  const dropRef = useRef(null);
  const dragRef = useRef(null);
  const [openAccordion, setOpenAccordion] = useState<boolean>(false);
  const isObject = typeof currentObj[keyName] === 'object' && currentObj[keyName] !== null;

  const [{ opacity }, drag, preview] = useDrag(
    () => ({
      type: 'row',
      item: {
        index, keyName, path, type: isObject ? 'object' : 'string',
      },
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    }),
    [],
  );

  const [{ border }, drop] = useDrop({
    accept: 'row',
    collect: (monitor) => ({
      border: monitor.isOver() ? '1px dashed white' : 'none',
    }),
    drop(droppedItem: any) {
      if (droppedItem.path === keyName) return;

      const toMove = obj[droppedItem.keyName];
      const tmpObj = { ...obj };
      delete tmpObj[droppedItem.keyName];
      onChange({
        ...tmpObj,
        [keyName]: {
          ...obj[keyName],
          [droppedItem.keyName]: toMove,
        },
      });
    },
  });

  const getRefWithPath = (key: string) => {
    const pathFormatted = `${path?.length === 0 ? '' : `${path}.`}${key}`;
    const tmpTotal = { ...obj };
    const keys = pathFormatted.split('.');

    let current = tmpTotal;
    for (let i = 0; i < keys.length - 1; i += 1) {
      current = current[keys[i]];
    }

    return [current, tmpTotal];
  };

  const onDelete = (key: string) => {
    const [ref, totalObject] = getRefWithPath(key);

    delete ref[key];

    onChange(totalObject);
  };

  const onChangeInput = (newValue: string, key: string) => {
    const [ref, totalObject] = getRefWithPath(key);

    ref[key] = newValue;

    onChange(totalObject);
  };

  const onDown = (key: string) => {
    const newObj = goBackOneDepthLevel(obj, `${path}.${key}`);
    onChange(newObj);
  };

  preview(drop(dropRef));
  drag(dragRef);

  return (
    <div style={{ border }} ref={isObject ? dropRef : null}>
      <div
        ref={dragRef}
        style={{ marginLeft: depthLevel * 20, opacity }}
        className="my-1 flex items-center py-1 rounded-xl flex-row bg-gray cursor-pointer"
        onClick={isObject
          ? () => setOpenAccordion((prev) => !prev)
          : () => {}}
      >
        <FontAwesomeIcon
          icon={faBars}
          className="ml-3 cursor-grab"
        />
        <p className="ml-2 text-sm rounded px-1 bg-gray-light">{keyName}</p>
        <p className="ml-2">:</p>
        {isObject ? (
          <div className="flex flex-row items-center">
            <p className="text-sm ml-2">{`{${Object.keys(currentObj[keyName]).length}}`}</p>
            <FontAwesomeIcon className="ml-3" icon={openAccordion ? faChevronDown : faChevronRight} />
          </div>
        ) : (
          <input
            value={currentObj[keyName] || 'null'}
            onChange={(e) => onChangeInput(e.target.value, keyName)}
            className="ml-2 w-96 text-sm bg-gray-dark rounded px-1"
          />
        )}
        <div className="ml-auto">
          {depthLevel > 0 && (
            <FontAwesomeIcon onClick={() => onDown(keyName)} className="mr-2" icon={faArrowDown} />
          )}
          <FontAwesomeIcon onClick={() => onDelete(keyName)} className="mr-2" icon={faTrash} />
        </div>
      </div>
      {openAccordion && isObject && (
        <RowsMapper
          dropRef={dropRef}
          currentObj={currentObj[keyName]}
          onChange={onChange}
          depthLevel={depthLevel + 1}
          path={`${path?.length > 0 ? `${path}.` : ''}${keyName}`}
          obj={obj}
        />
      )}
    </div>
  );
}
