import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import Genre from '../../shared/Genre';
import GenreMap from '../../shared/GenreMap';
import GenreRepository from '../../shared/GenreRepository';
import UpdateGenreWeightDomain from '../UpdateGenreWeightDomain';
import { GenreError } from '../../shared/GenreError';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-updateGenreWeightDomain');
mockJestTimers();
const uid = new UIDGenerator();
const genreMap = new GenreMap(uid);
const genreRepository = new GenreRepository(
  ddbClient,
  TEST_TABLE_NAME,
  genreMap,
);
const domain = new UpdateGenreWeightDomain(genreRepository, genreMap);

describe('UpdateGenreWeightDomain', () => {
  describe('updateGenre', () => {
    it('should change the weight of all genres', async () => {
      // Arrange
      const genres = Array.from(Array(5).keys()).map((key) => Genre.create({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: false,
        extId: `genre-${key}`,
        name: `genre-${key}`,
        weight: key,
      }, key.toString()));

      await Promise.all(genres.map(async (genre) => {
        await genreRepository.save(genre);
      }));

      // Act
      const shouldBeTruthy = await domain.updateGenreWeight('2', '5');
      const updatedGenres = await genreRepository.findAll();

      // Assert
      expect(shouldBeTruthy).toBeTruthy();
      expect(updatedGenres[4]).toEqual({
        id: '2',
        extId: 'genre-2',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: false,
        name: 'genre-2',
        weight: 4,
      });
    });

    it('should throw GenreNotFound exception', async () => {
      // Arrange
      const genres = Array.from(Array(5).keys()).map((key) => Genre.create({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: false,
        extId: `genre-${key}`,
        name: `genre-${key}`,
        weight: key,
      }, key.toString()));
      await Promise.all(genres.map(async (genre) => {
        await genreRepository.save(genre);
      }));

      // Act & Assert
      await expect(async () => domain.updateGenreWeight('random', '5')).rejects.toThrow(GenreError.GenreNotFound);
    });
  });
});
