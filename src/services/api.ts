
import { WeatherData, SpotifyTrack } from "@/types";
import { getWeatherForLocation } from "@/utils/weatherUtils";
import { searchSpotifyTracks, getSpotifyAuthUrl, handleSpotifyCallback } from "@/services/spotify";

// Fetch weather data using actual coordinates
export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  return await getWeatherForLocation(lat, lon);
};

// Spotify API wrappers
export const fetchSpotifyAuthUrl = async (): Promise<string> => {
  return await getSpotifyAuthUrl();
};

export const processSpotifyCallback = async (code: string): Promise<any> => {
  return await handleSpotifyCallback(code);
};

export const searchSongs = async (query: string): Promise<SpotifyTrack[]> => {
  return await searchSpotifyTracks(query);
};
