import Category from './Category';

export interface ParentDocument {
  PK: string;
  SK: string;
  id: string;
  weight?: number;
}

export interface ICategoryRepository {
  findAll(): Promise<Category[]>
  findMany(ids: string[]): Promise<Category[]>
  findOne(id: string): Promise<Category | undefined>
  hasRelationships(category: Category): Promise<boolean>
  getParentRelationships(parent: string, parentId: string): Promise<Array<ParentDocument>>
  remove(category: Category): Promise<boolean>
  save(category: Category): Promise<boolean>
  exists(category: Category): Promise<boolean>
  updateWeight(categories: Array<Category>): Promise<boolean>
}
