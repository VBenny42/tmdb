import { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "./api";
import { ShowResponse } from "moviedb-promise";
import { format } from "date-fns";
import TvShowDetail from "./components/TvShowDetail";
import Posters from "./components/Posters";
import Backdrops from "./components/Backdrops";
import Seasons from "./components/Seasons";
import Episodes from "./components/Episodes";
import { getSeasonStartEnd } from "./get-current-season";

type RecentSearch = {
  name: string;
  id: number;
};

export default function Command() {
  const preferences = getPreferenceValues();
  if (preferences.currShow === undefined || preferences.currShowSeason === undefined) {
    showToast(Toast.Style.Failure, "Note: No show and/or season is set in preferences");
  }

  const [query, setQuery] = useState("");

  const { data: trendingResults, isLoading: isLoadingTrendingResults } = useCachedPromise(async () => {
    const results = await moviedb.trending({ media_type: "tv", time_window: "day" });
    return results.results;
  });

  const { data: searchResults, isLoading: isLoadingSearchResults } = useCachedPromise(
    async (query) => {
      const results = await moviedb.searchTv({ query });
      return results.results;
    },
    [query],
    {
      execute: query.length > 0,
      keepPreviousData: true,
    },
  );

  const {
    data: recentSearches,
    isLoading: isLoadingRecentSearches,
    revalidate,
  } = useCachedPromise(async () => {
    const recentSearchesData = await LocalStorage.getItem<string>("recentSearches");
    const recentSearches: RecentSearch[] = recentSearchesData ? JSON.parse(recentSearchesData) : [];
    return (
      (await Promise.all(
        recentSearches.map((search) => {
          return moviedb.tvInfo({ id: search.id });
        }),
      )) || []
    );
  });

  // NOTE: update recent searches on Push to seasons view
  // that way we only add to recent searches when the user actually wants to see more info

  const showTrendingSection =
    (!searchResults || searchResults.length === 0 || query.length === 0) && recentSearches?.length <= 5;
  const showRecentSearches = !searchResults || searchResults.length === 0 || query.length === 0;

  return (
    <List
      isLoading={isLoadingTrendingResults || isLoadingSearchResults || isLoadingRecentSearches}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail
      searchBarPlaceholder="Search for a TV show"
    >
      {showRecentSearches ? (
        <List.Section title="Recent Searches">
          {recentSearches?.map((show) => {
            return <Show key={show.id} show={show} isInRecentSearches={true} revalidate={revalidate} />;
          })}
        </List.Section>
      ) : null}

      {showTrendingSection ? (
        <List.Section title="Trending">
          {trendingResults?.map((result) => {
            return <Show key={result.id} show={result} />;
          })}
        </List.Section>
      ) : null}

      <List.Section title="Search Results">
        {searchResults?.map((result) => {
          return <Show key={result.id} show={result} />;
        })}
      </List.Section>
    </List>
  );
}

const updateRecentSearches = async (search: RecentSearch) => {
  const recentSearchesData = await LocalStorage.getItem<string>("recentSearches");

  const recentSearchesArray = recentSearchesData ? JSON.parse(recentSearchesData) : [];
  const newRecentSearches = [
    search,
    ...recentSearchesArray.filter((item: RecentSearch) => item.id !== search.id),
  ].slice(0, 10);

  await LocalStorage.setItem("recentSearches", JSON.stringify(newRecentSearches));
};

const removeFromRecentSearches = async (search: RecentSearch) => {
  const recentSearchesData = await LocalStorage.getItem<string>("recentSearches");

  const recentSearchesArray = recentSearchesData ? JSON.parse(recentSearchesData) : [];
  const newRecentSearches = recentSearchesArray.filter((item: RecentSearch) => item.id !== search.id);

  await LocalStorage.setItem("recentSearches", JSON.stringify(newRecentSearches));
};

type ShowProps = {
  show: ShowResponse;
  isInRecentSearches?: boolean;
  revalidate?: () => void;
};

function Show(showProps: ShowProps) {
  const show = showProps.show;
  const title = show.name ?? show.original_name ?? "Unknown Show";
  const firstAirDate = show.first_air_date ? format(new Date(show.first_air_date ?? ""), "PP") : "Unknown";
  const lastAirDate = show.last_air_date ? format(new Date(show.last_air_date ?? ""), "PP") : "";

  const rating = show.vote_average ? show.vote_average.toFixed(1) : "Not Rated";
  const { push } = useNavigation();

  return (
    <List.Item
      icon={`https://image.tmdb.org/t/p/w200/${show.poster_path}`}
      title={show.name ?? "Unknown Show"}
      detail={
        <List.Item.Detail
          markdown={`![Movie Banner](https://image.tmdb.org/t/p/w500/${show.backdrop_path})${
            show.overview ? `\n\n${show.overview}` : ""
          }`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={title} />
              <List.Item.Detail.Metadata.Label title="Media Type" text="TV Show" />
              <List.Item.Detail.Metadata.Label title="First Air Date" text={firstAirDate} />
              {lastAirDate ? <List.Item.Detail.Metadata.Label title="Last Air Date" text={lastAirDate} /> : null}

              <List.Item.Detail.Metadata.Label
                title="Rating"
                text={`${rating}${show.vote_count ? ` (${show.vote_count} votes)` : ""}`}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Label title="TMDB ID" text={show.id ? show.id.toString() : "Unknown"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Show Seasons"
            icon={Icon.Image}
            onAction={async () => {
              if (show.id) {
                // NOTE: There is a bug where even if revalidate is called, the list doesn't update
                //       until we go back to root and re-enter the command
                await updateRecentSearches({ name: title, id: show.id });
                showProps.revalidate?.();
                push(<Seasons id={show.id} />);
              }
            }}
          />
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<TvShowDetail show={show} />} />
          <Action.OpenInBrowser url={`https://www.themoviedb.org/tv/${show.id ?? 0}`} />
          {show.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={show.id.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          ) : null}
          <Action.Push
            title="Show Posters"
            icon={Icon.Image}
            target={show.id !== undefined && <Posters id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            title="Show Backdrops"
            icon={Icon.Image}
            target={show.id !== undefined && <Backdrops id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
          <Action
            title="Show Current Season From Preferences"
            icon={Icon.Star}
            onAction={() => {
              const { currShow, currShowSeason } = getPreferenceValues();
              if (currShow !== undefined && currShowSeason !== undefined) {
                getSeasonStartEnd().then((data) => {
                  const { seasonStart, seasonEnd } = data;
                  push(
                    <Episodes
                      id={currShow}
                      seasonNumber={currShowSeason}
                      seasonStart={seasonStart}
                      seasonEnd={seasonEnd}
                    />,
                  );
                });
              } else {
                showToast(Toast.Style.Failure, "No show and/or season is set in preferences");
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {showProps.isInRecentSearches ? (
            <ActionPanel.Section>
              <Action
                title="Remove From Recent Searches"
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                onAction={async () => {
                  await removeFromRecentSearches({ name: title, id: show.id ?? 0 });
                  showProps.revalidate?.();
                }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel.Section>
          ) : null}
          <Action icon={Icon.Gear} title="Open Command Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
