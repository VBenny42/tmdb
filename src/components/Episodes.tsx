import { ActionPanel, Action, Grid, Icon, showToast, Toast } from "@raycast/api";
import { moviedb } from "../api";
import { SimpleEpisode } from "moviedb-promise";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import TvShowEpisode from "./TvShowEpisode";

function Episodes({
  id,
  seasonNumber,
  numberOfSeasons,
}: {
  id: number;
  seasonNumber: number;
  numberOfSeasons: number;
}) {
  const [selectedEpisode, setSelectedEpisode] = useState<string>("all");
  const [_seasonNumber, setSeasonNumber] = useState<number>(seasonNumber);

  const fetchEpisodes = async (id: number, seasonNumber: number) => {
    const response = await moviedb.seasonInfo({ id, season_number: seasonNumber });
    return response.episodes || [];
  };

  const { data: episodeData, isLoading: isLoadingEpisodes } = useCachedPromise(fetchEpisodes, [id, seasonNumber], {
    onError: async (error) => {
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

  const fetchShowInfo = async (id: number) => {
    const response = await moviedb.tvInfo({ id });
    return response.name || "Unknown Show";
  };

  const { data: showInfo, isLoading: isLoadingInfo } = useCachedPromise(fetchShowInfo, [id], {
    onError: async (error) => {
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

  const episodeStart = episodeData?.[0]?.episode_number || 0;
  const episodeEnd = episodeData?.[episodeData.length - 1]?.episode_number || 0;

  const filteredEpisodes = ((episodeData as SimpleEpisode[]) || []).filter(
    (episode) =>
      selectedEpisode === "all" ||
      selectedEpisode === episode.episode_number?.toString() ||
      episode.episode_number === 0,
  );

  return (
    <Grid
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      isLoading={isLoadingEpisodes || isLoadingInfo}
      columns={3}
      searchBarPlaceholder={`Filter through ${showInfo} episodes by name`}
      navigationTitle={`TV Episodes - ${selectedEpisode === "all" ? "All" : selectedEpisode}`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Episode" onChange={setSelectedEpisode} value={selectedEpisode}>
          <Grid.Dropdown.Section title="Episodes">
            <Grid.Dropdown.Item title="All" value="all" />
            {(episodeData || []).map((episode) => (
              <Grid.Dropdown.Item
                key={episode.episode_number || "no-episode"}
                title={episode.episode_number?.toString() || "Unknown Episode"}
                value={episode.episode_number?.toString() || "no-episode"}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredEpisodes.map((episode) => (
        <Grid.Item
          content={`https://image.tmdb.org/t/p/w342${episode.still_path}`}
          title={`Episode ${episode.episode_number} - ${episode.name || "Unknown Episode"}`}
          key={episode.still_path}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Episode Details"
                icon={Icon.Info}
                target={
                  <TvShowEpisode
                    showId={id}
                    seasonNumber={seasonNumber}
                    _episodeNumber={episode.episode_number ? episode.episode_number : 0}
                    episodeStart={episodeStart}
                    episodeEnd={episodeEnd}
                  />
                }
              />
              <Action.OpenInBrowser
                url={`https://www.themoviedb.org/tv/${id}/season/${seasonNumber}/episode/${episode.episode_number}`}
                title="Open in TMDB"
              />
              <Action.CopyToClipboard
                content={`https://www.themoviedb.org/tv/${id}/season/${seasonNumber}/episode/${episode.episode_number}`}
                title={`Copy TMDB URL`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action
                title="Next Season"
                icon={Icon.ArrowRight}
                onAction={() => {
                  let setNumber = 0;
                  if (_seasonNumber < numberOfSeasons) {
                    setNumber = _seasonNumber + 1;
                  }
                  setSeasonNumber(setNumber);
                  console.log("LOG: setNumber:", setNumber);
                }}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {episodeData && filteredEpisodes.length === 0 && <Grid.Item title="No episodes available" content="" />}
    </Grid>
  );
}

export default Episodes;
// <ActionPanel>
//         <Action
//           title="Show Next Season"
//           onAction={() => {
//             console.log("LOG: _numberOfSeasons:", _seasonNumber);
//             if (_seasonNumber < numberOfSeasons) {
//               setSeasonNumber(seasonNumber + 1);
//               console.log("LOG: seasonNumber:", _seasonNumber);
//             } else {
//               setSeasonNumber(0);
//             }
//           }}
//           shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
//         />
//       </ActionPanel>
//
