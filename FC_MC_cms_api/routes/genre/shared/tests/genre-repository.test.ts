import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { GenreDto } from '../../../shared/dto/GenreDto';
import Genre from '../Genre';
import GenreRepository from '../GenreRepository';
import GenreMap from '../GenreMap';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TABLE_NAME = 'test-genreRepository';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});
const genreDto: Required<Omit<GenreDto, 'id'>> = {
  extId: 'reality-genre',
  name: 'Reality',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  weight: 10,
  enabled: true,
};

const uid = new UIDGenerator();
const GENRE_ID = uid.generate(8);

const genre = Genre.create(genreDto, GENRE_ID);
const genreMap = new GenreMap(uid);
const repository = new GenreRepository(ddbClient, TABLE_NAME, genreMap);

describe('Empty database', () => {
  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should check if a Genre exists and return false', async () => {
    expect(await repository.exists(genre)).toBeFalsy();
  });

  it('should return all an empty array', async () => {
    expect(await repository.findAll()).toEqual([]);
  });

  it('should return false if not relationships are found', async () => {
    expect(await repository.hasRelationships(genre)).toBeFalsy();
  });
});

describe('Non-Empty database', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
    await repository.save(genre);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should save a new Genre', async () => {
    expect(await repository.save(genre)).toBeTruthy();
  });

  it('should check if a Genre exists and return true', async () => {
    expect(await repository.exists(genre)).toBeTruthy();
  });

  it('should find one item given an id', async () => {
    expect(await repository.findOne(genre.id)).toEqual(genre);
  });

  it('should return true if relationships are found', async () => {
    const items = Array.from(Array(2).keys()).map((_, key) => ({
      PK: `C#${key}`,
      SK: `ASSET#GENRE#${GENRE_ID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#GENRE#${GENRE_ID}`,
      'GSI1-SK': `C#${key}`,
    }));
    await repository.batchWriteItem(items);

    expect(await repository.hasRelationships(genre)).toBeTruthy();
  });

  it('should find requested categories', async () => {
    const newGenre = Genre.create({
      extId: 'local:local-now',
      name: 'Local Now',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      enabled: true,
      weight: 10,
    }, 'genreNewId');
    await expect((await repository.findMany([genre.id, 'genreNewId'])).length).toEqual(1);
    await repository.save(newGenre);
    await expect((await repository.findMany([genre.id, 'genreNewId'])).length).toEqual(2);

    await repository.remove(newGenre);
  });

  it('findBy (extId) - should get previously saved genre instance', async () => {
    const resultGenres = await repository.findBy('extId', genre.extId);

    expect(resultGenres.length).toBeGreaterThan(0);
    expect(resultGenres[0].id).toEqual(genre.id);
  });

  it('should remove an item', async () => {
    expect(await repository.findOne(genre.id)).toBeDefined();

    expect(await repository.remove(genre)).toBeTruthy();

    expect(await repository.findOne(genre.id)).toBeUndefined();
  });

  it('should return all genres sorted by weight', async () => {
    const genres = await Promise.all(Array.from(Array(20)
      .keys()).map(async (item, key) => {
      const genreEntity = genreMap.toDomain({
        id: key.toString(),
        name: `Genre ${key}`,
        extId: `genre-${key}`,
        weight: key,
      });
      await repository.save(genreEntity);
      return genreEntity;
    }));
    expect(await repository.findAll()).toMatchObject(genres);
  });

  it('should update weight of all genres', async () => {
    // Arrange
    const genres = await Promise.all(Array.from(Array(20)
      .keys()).map(async (item, key) => genreMap.toDomain({
      id: key.toString(),
      name: `Genre ${key}`,
      extId: `genre-${key}`,
      weight: key + 10,
    })));

    // Act
    const beforeWeightUpdate = await repository.findOne('10');
    const shouldBeTruthy = await repository.updateWeight(genres);
    const afterWeightUpdate = await repository.findOne('10');

    // Assert
    expect(shouldBeTruthy).toBeTruthy();
    expect(beforeWeightUpdate?.weight).toEqual(10);
    expect(afterWeightUpdate?.weight).toEqual(20);
  });
});

describe.each([
  (payload: Genre) => repository.remove(payload),
  (payload: Genre) => repository.save(payload),
  (payload: Genre) => repository.exists(payload),
  (payload: Genre) => repository.hasRelationships(payload),
  (id: string) => repository.findOne(id),
  // An empty id list never reaches DynamoDB, so pass an id to hit the missing table
  () => repository.findMany([GENRE_ID]),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
