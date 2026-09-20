import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface WeatherData {
  location: string;
  temperature: number;
  highTemp: number;
  lowTemp: number;
  humidityPercentage: number;
  precipitationMl: number;
  pressureHpa: number;
  windMps: number;
  sunriseTime: string;
  sunsetTime: string;
  isCached: boolean;
}

export const weatherApi = createApi({
  reducerPath: 'weatherApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getWeather: builder.query<WeatherData, void>({
      query: () => '/weather',
    }),
  }),
});

export const { useGetWeatherQuery } = weatherApi;
