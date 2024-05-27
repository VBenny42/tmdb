import { ActionPanel, Action, Grid, Icon, showToast, Toast } from "@raycast/api";
import { moviedb } from "../api";
import { SimpleEpisode } from "moviedb-promise";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import TvShowEpisode from "./TvShowEpisode";

function Episodes({ id, seasonNumber }: { id: number; seasonNumber: number }) {
  const [selectedEpisode, setSelectedEpisode] = useState<string>("all");

  const fetchEpisodes = async (id: number, seasonNumber: number) => {
    const response = await moviedb.seasonInfo({ id, season_number: seasonNumber });
    return response.episodes || [];
  };

  const { data: episodeData, isLoading } = useCachedPromise(fetchEpisodes, [id, seasonNumber], {
    onError: async (error) => {
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

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
      isLoading={isLoading}
      columns={3}
      searchBarPlaceholder={`Filter TV episodes by name`}
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
                    episodeNumber={episode.episode_number ? episode.episode_number : 0}
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
            </ActionPanel>
          }
        />
      ))}
      {episodeData && filteredEpisodes.length === 0 && <Grid.Item title="No episodes available" content="" />}
    </Grid>
  );
}

export default Episodes;