import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast } from "@raycast/api";
import { format } from "date-fns";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";

export default function TvShowEpisode({
  showId,
  seasonNumber,
  episodeNumber,
}: {
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
}) {
  const { data: episodeDetails, isLoading: isLoadingEpisodeDetails } = useCachedPromise(
    async (showId, seasonNumber, episodeNumber) => {
      if (showId && seasonNumber && episodeNumber) {
        const seasonLength = await moviedb.seasonInfo({ id: showId, season_number: seasonNumber }).then((response) => {
          return response.episodes?.length;
        });
        const episodeInfo = await moviedb.episodeInfo({
          season_number: seasonNumber,
          episode_number: episodeNumber,
          id: showId,
        });
        return { ...episodeInfo, seasonLength };
      }
    },
    [showId, seasonNumber, episodeNumber],
    {
      onError: async (error) => {
        await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
      },
    },
  );

  if (!episodeDetails) {
    return null;
  }
  const title = episodeDetails.name ?? "Unknown Name";
  const firstAirDate = episodeDetails.air_date ? format(new Date(episodeDetails.air_date ?? ""), "PP") : "Unknown";
  const rating = episodeDetails.vote_average ? episodeDetails.vote_average.toFixed(1) : "No Ratings";
  const seasonLength = episodeDetails.seasonLength ?? 0;

  const markdown = `![TV Show Banner](https://image.tmdb.org/t/p/w500/${episodeDetails.still_path})\n\n${
    episodeDetails.overview ?? ""
  }`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingEpisodeDetails}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          <Detail.Metadata.Label title="Air Date" text={firstAirDate} />
          <Detail.Metadata.TagList title="Season and Episode Number">
            <Detail.Metadata.TagList.Item text={`${seasonNumber}`} color={Color.Blue} />
            <Detail.Metadata.TagList.Item text={`${episodeNumber}`} color={Color.Green} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Rating"
            text={`${rating}${episodeDetails.vote_count ? ` (from ${episodeDetails.vote_count} votes)` : ""}`}
            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in TMDB"
            url={`https://www.themoviedb.org/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`}
          />
          {episodeDetails.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={episodeDetails.id.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          ) : null}
          <Action.Push
            title="Next Episode"
            icon={Icon.ArrowRight}
            target={
              <TvShowEpisode
                showId={showId}
                seasonNumber={seasonNumber}
                episodeNumber={episodeNumber < seasonLength ? episodeNumber + 1 : 1}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          />
          <Action.Push
            title="Previous Episode"
            icon={Icon.ArrowLeft}
            target={
              <TvShowEpisode
                showId={showId}
                seasonNumber={seasonNumber}
                episodeNumber={episodeNumber > 1 ? episodeNumber - 1 : seasonLength}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          />
        </ActionPanel>
      }
    />
  );
}
