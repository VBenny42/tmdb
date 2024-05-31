import { getPreferenceValues } from "@raycast/api";
import { moviedb } from "./api";

const { currShow } = getPreferenceValues();

export async function getSeasonStartEnd() {
  const seasons = await moviedb.tvInfo({ id: currShow }).then((response) => response.seasons || []);

  const seasonStart = seasons?.[0].season_number || 0;
  const seasonEnd = seasons?.[seasons.length - 1].season_number || 0;

  return { seasonStart, seasonEnd };
}
