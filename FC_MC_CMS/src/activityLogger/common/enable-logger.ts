export default async function enableLogger(entityName: string, checked: boolean) {
  console.log(`${entityName} has been ${checked ? 'enabled' : 'disabled'}`);
}
