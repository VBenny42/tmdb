import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast } from "@raycast/api";
import { format } from "date-fns";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";
import Posters from "./Posters";
import Backdrops from "./Backdrops";

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
        return await moviedb.episodeInfo({ season_number: seasonNumber, episode_number: episodeNumber, id: showId });
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

  const markdown = `# ${title}\n![TV Show Banner](https://image.tmdb.org/t/p/w500/${episodeDetails.still_path})\n\n${
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
            title="Show Posters"
            icon={Icon.Image}
            target={episodeDetails.id !== undefined && <Posters id={episodeDetails.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            title="Show Backdrops"
            icon={Icon.Image}
            target={episodeDetails.id !== undefined && <Backdrops id={episodeDetails.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}
