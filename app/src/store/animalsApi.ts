import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Animal {
  id: number;
  userId?: number | null;
  name: string;
  breed: string;
  weight: string;
  age: string;
  color: string;
  image?: string;
  description?: string;
  dob?: string;
  gender?: string;
  source?: string;
  joinedFarm?: string;
  liveWeight?: string;
  reproStatus?: string;
  photos?: string[];
  photoCost?: string;
  sellingPrice?: string;
  liveWeightPrice?: string;
}

export type NewAnimal = Omit<Animal, 'id' | 'userId'>;

export const animalsApi = createApi({
  reducerPath: 'animalsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Animal'],
  endpoints: (builder) => ({
    getAnimals: builder.query<Animal[], void>({
      query: () => '/animals',
      providesTags: (result) =>
        result
          ? [...result.map((a) => ({ type: 'Animal' as const, id: a.id })), { type: 'Animal', id: 'LIST' }]
          : [{ type: 'Animal', id: 'LIST' }],
    }),
    getAnimalById: builder.query<Animal, string>({
      query: (id) => `/animals/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Animal', id }],
    }),
    uploadAnimalPhoto: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: '/animals/upload-photo',
        method: 'POST',
        body: formData,
      }),
    }),
    addAnimal: builder.mutation<Animal, NewAnimal>({
      query: (body) => ({ url: '/animals', method: 'POST', body }),
      invalidatesTags: [{ type: 'Animal', id: 'LIST' }],
    }),
    updateAnimal: builder.mutation<Animal, { id: string; data: Partial<NewAnimal> }>({
      query: ({ id, data }) => ({ url: `/animals/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Animal', id },
        { type: 'Animal', id: 'LIST' },
      ],
    }),
    deleteAnimal: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/animals/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Animal', id },
        { type: 'Animal', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAnimalsQuery,
  useGetAnimalByIdQuery,
  useUploadAnimalPhotoMutation,
  useAddAnimalMutation,
  useUpdateAnimalMutation,
  useDeleteAnimalMutation,
} = animalsApi;
