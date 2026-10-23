export default async function updateLogger(
  entityName: string,
  updatedFields: string[],
) {
  console.log('updated fields: ', updatedFields);
  console.log(`a ${entityName} was updated`);
}
