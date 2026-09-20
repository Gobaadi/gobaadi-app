import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  brandId?: number;
  categoryId?: number;
  images: string[];
  isPrescriptionRequired: boolean;
  status: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
}

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Category', 'Brand'],
  endpoints: (builder) => ({
    getProducts: builder.query<
      Product[] | { data: Product[]; total: number },
      { page?: number; limit?: number; categoryId?: number; brandId?: number; search?: string }
    >({
      query: (params) => ({
        url: '/products',
        params,
      }),
      providesTags: (result) => {
        const items = result && 'data' in result ? result.data : (result || []);
        return [
          ...items.map((i) => ({ type: 'Product' as const, id: i.id })),
          { type: 'Product', id: 'LIST' },
        ];
      },
    }),
    getProduct: builder.query<Product, number>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    getCategories: builder.query<Category[], void>({
      query: () => '/products/categories',
      providesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    getBrands: builder.query<Brand[], void>({
      query: () => '/products/brands',
      providesTags: [{ type: 'Brand', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useGetCategoriesQuery,
  useGetBrandsQuery,
} = productsApi;
