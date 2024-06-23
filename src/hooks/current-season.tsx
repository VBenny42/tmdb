import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";

export type CurrentSeason = {
  id: number;
  season_number: number;
};

export function useCurrentSeason() {
  const localStorageKey = "current-season";
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const currentSeasonData = await LocalStorage.getItem<string>(localStorageKey);
    const currentSeason: CurrentSeason = currentSeasonData ? JSON.parse(currentSeasonData) : null;

    const seasons = await moviedb.tvInfo({ id: currentSeason?.id }).then((response) => response.seasons || []);

    const seasonStart = seasons?.[0].season_number || 0;
    const seasonEnd = seasons?.[seasons.length - 1].season_number || 0;

    return { currentSeason, seasonStart, seasonEnd };
  });

  async function setCurrentSeason(data: CurrentSeason) {
    if (!data) {
      return;
    }

    await LocalStorage.setItem(localStorageKey, JSON.stringify(data));
    mutate();
  }

  async function removeCurrentSeason(data: CurrentSeason) {
    if (!data) {
      return;
    }

    await LocalStorage.setItem(localStorageKey, JSON.stringify(null));
    mutate();
  }

  return {
    mutate,
    isLoading,
    currentSeason: data?.currentSeason,
    seasonStart: data?.seasonStart,
    seasonEnd: data?.seasonEnd,
    setCurrentSeason,
    removeCurrentSeason,
  };
}
