import { toast } from 'react-toastify';

export default function handleSuccess(
  goBack: () => void,
  refetch: () => void,
  name: string,
  action: 'add' | 'edit',
): void {
  toast.success(`${name} ${action === 'edit' ? 'updated' : 'added'} successfully`);
  refetch?.();
  goBack();
}
