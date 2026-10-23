import { useNavigate, useParams } from 'react-router-dom';
import React, { useMemo } from 'react';
import { Nav } from '@/components';
import AddTopPageButton from '@components/commons/AddTopPageButton';
import CustomLoader from '@components/commons/CustomLoader';
import FormModal from '@components/commons/forms/FormModal';

interface HasId {
  id: string;
}

type DataTypeWithId<T> = T extends HasId ? T : T & HasId;

interface FormComponentProps<DataType> {
  refetch: () => void;
  action: 'add' | 'edit';
  id?: string;
  data?: DataType;
}

interface TableComponentProps<DataType> {
  refetch: () => void;
  data: DataType[];
}

interface EntityModalFormTablePageProps<DataType, FormType> {
  action: 'add' | 'edit' | 'list';
  useData: () => any;
  title: string;
  desc: string;
  Form: React.FC<FormComponentProps<DataType & any>>
  | React.FC<FormComponentProps<DataType & any> & FormType>;
  formProps?: any;
  Table: React.FC<TableComponentProps<DataType>>;
  dataFieldName: string;
  mapData?: (data: DataType) => any;
}

export default function EntityModalFormTablePage<DataType extends HasId, FormType = any>({
  action,
  useData,
  title,
  desc,
  Form,
  Table,
  dataFieldName,
  mapData,
  formProps,
}: EntityModalFormTablePageProps<DataTypeWithId<DataType>, FormType>) {
  const {
    data,
    error,
    isFetching,
    refetch,
  } = useData();
  const navigate = useNavigate();
  const { id } = useParams();

  const items: DataTypeWithId<DataType>[] = useMemo(
    () => {
      if (!data?.data?.[dataFieldName] || isFetching || error) return [];
      if (!mapData) return data.data[dataFieldName];
      return data.data[dataFieldName].map(mapData);
    },
    [data, isFetching, error],
  );

  let item: DataTypeWithId<DataType> | undefined;

  if (action === 'edit' && id) {
    item = items.find((i: DataTypeWithId<DataType>) => i.id === id);
  }

  return (
    <Nav.Content
      title={title}
      desc={desc}
    >
      <AddTopPageButton />
      {isFetching && <CustomLoader />}
      {!isFetching && (
        <>
          <Table refetch={refetch} data={items} />
          {(action === 'add' || action === 'edit') && (
            <FormModal isOpen onRequestClose={() => navigate(-1)}>
              {action === 'edit' && item && id && (
                <Form
                  refetch={refetch}
                  action={action}
                  id={id}
                  data={item}
                  {...formProps}
                />
              )}
              {action === 'add' && (
                <Form
                  refetch={refetch}
                  action={action}
                  {...formProps}
                />
              )}
            </FormModal>
          )}
        </>
      )}
    </Nav.Content>
  );
}
