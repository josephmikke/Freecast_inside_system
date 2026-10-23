import React, { useEffect, useState } from 'react';
import CustomTable from '@components/commons/tables/CustomTable';
import useEpisodesColumns from '@components/content/vod/episodes/useEpisodesColumns';
import { Episodes } from '@/api';
import EpisodeFormModal from '@components/content/vod/episodes/EpisodeFormModal';
import { EpisodeResult, Season } from '@entities/content/vod';
import SeasonTabs from '@components/content/vod/SeasonTabs';

interface VodSeasonsProps {
  action: 'add' | 'edit';
  episodes: EpisodeResult[];
  refetch: () => void;
}

export default function VodSeasons({
  action,
  episodes,
  refetch,
}: VodSeasonsProps) {
  const [selectedSeason, setSelectedSeason] = useState<Season>();
  const [modalOpened, setModalOpened] = useState<string>();
  const [selectedEpisode, setSelectedEpisode] = useState<string>('');
  const [seasons, setSeasons] = useState<Season[]>([]);

  useEffect(() => {
    const tmpSeasons: Season[] = [];
    episodes?.forEach((episode) => {
      const season = tmpSeasons.find((_season: Season) => _season.seasonNumber === episode.season);
      if (season) {
        season.episodes.push(episode);
      } else {
        tmpSeasons.push({ seasonNumber: episode.season, episodes: [episode] });
      }
    });

    tmpSeasons.sort((a, b) => parseInt(a.seasonNumber, 10) - parseInt(b.seasonNumber, 10));
    tmpSeasons.forEach((season) => {
      season.episodes.sort((a, b) => b.number - a.number);
    });
    if (tmpSeasons && tmpSeasons.length !== 0) {
      setSelectedSeason(tmpSeasons[0]);
    }
    setSeasons(tmpSeasons);
  }, [episodes]);

  const handleDelete = async (id: string) => {
    await Episodes.deleteEpisode(id);
    refetch();
  };

  const handleUpdate = async (id: string, { enabled }: { enabled: boolean }) => {
    await Episodes.updateEpisode(id, { enabled });
    refetch();
  };

  return (
    <div>
      <span>Seasons</span>
      <div className="flex flex-col mt-3">
        <div className="mt-3 flex flex-col">
          <SeasonTabs
            data={seasons}
            selected={selectedSeason}
            onSelect={(season) => { setSelectedSeason(season); }}
          />
          {selectedSeason && (
            <div className="w-full">
              <CustomTable
                refetch={() => null}
                data={selectedSeason.episodes}
                useColumns={useEpisodesColumns}
                customOnClickRow={(id: string) => {
                  setModalOpened(selectedSeason?.seasonNumber);
                  setSelectedEpisode(id);
                }}
                deleteEntity={handleDelete}
                updateEntity={handleUpdate}
                entityName="Episode"
                rowRounded="rounded-md"
                rowHeight={70}
              />
              <EpisodeFormModal
                action={action}
                episode={selectedSeason.episodes.find((episode) => episode.id === selectedEpisode)}
                isOpen={modalOpened === selectedSeason.seasonNumber}
                refetch={refetch}
                onClose={() => setModalOpened(undefined)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
