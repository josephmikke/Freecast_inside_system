import { toast } from 'react-toastify';

export default function handleError(
  action: 'add' | 'edit',
  name: string,
  error?: string,
) {
  toast.error(
    `Error ${action === 'edit' ? 'updating' : 'adding'} ${name} : ${JSON.stringify(error)}`,
    {
      autoClose: false,
    },
  );
}
