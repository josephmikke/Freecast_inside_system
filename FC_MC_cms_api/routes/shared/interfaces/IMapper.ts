// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IMapper<Class, RequestDto, Dto> {
  toDomain(raw: Dto): Class
  toDto(raw: Dto): Class
}
