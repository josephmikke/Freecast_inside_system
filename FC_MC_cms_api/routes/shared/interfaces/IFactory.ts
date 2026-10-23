// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IFactory<Class, RequestDto, Dto> {
  toDomain(raw: Dto): Class | Promise<Class>
  toPersistence(raw: Class): Dto
}
