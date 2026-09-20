import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface SearchAnimalHit {
  id: number;
  name: string;
  breed: string;
}

export interface SearchMarketItemHit {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface SearchDoctorHit {
  id: number;
  name: string;
  specialty: string;
}

export interface SearchAlertHit {
  id: number;
  title: string;
  location: string;
  crop: string;
}

export interface SearchResults {
  animals?: SearchAnimalHit[];
  marketplace?: SearchMarketItemHit[];
  doctors?: SearchDoctorHit[];
  alerts?: SearchAlertHit[];
}

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    search: builder.query<SearchResults, string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
    }),
  }),
});

export const { useSearchQuery, useLazySearchQuery } = searchApi;
