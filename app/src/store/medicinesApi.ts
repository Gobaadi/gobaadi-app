import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface MedicineCatalogItem {
  id: number;
  name: string;
  type: string;
}

export const medicinesApi = createApi({
  reducerPath: 'medicinesApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    searchMedicines: builder.query<MedicineCatalogItem[], string>({
      query: (q) =>
        q ? `/medicines?q=${encodeURIComponent(q)}` : '/medicines',
    }),
  }),
});

export const { useLazySearchMedicinesQuery } = medicinesApi;
