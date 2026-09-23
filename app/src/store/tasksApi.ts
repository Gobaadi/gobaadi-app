import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './base-query-with-reauth';

export interface Task {
  id: number;
  userId: number;
  title: string;
  detail?: string;
  scheduledTime: string;
  isDone: boolean;
}

export interface NewTask {
  title: string;
  detail?: string;
  scheduledTime: string;
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], string>({
      query: (date) => `/tasks?date=${date}`,
      providesTags: (result) =>
        result
          ? [...result.map((t) => ({ type: 'Task' as const, id: t.id })), { type: 'Task', id: 'LIST' }]
          : [{ type: 'Task', id: 'LIST' }],
    }),
    createTask: builder.mutation<Task, NewTask>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),
    toggleTask: builder.mutation<Task, string>({
      query: (id) => ({ url: `/tasks/${id}/toggle`, method: 'PATCH' }),
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const patches: { undo: () => void }[] = [];
        const state = getState() as any;
        for (const key of tasksApi.util.selectCachedArgsForQuery(state, 'getTasks')) {
          const patch = dispatch(
            tasksApi.util.updateQueryData('getTasks', key, (draft) => {
              const task = draft.find((t) => String(t.id) === id);
              if (task) task.isDone = !task.isDone;
            }),
          );
          patches.push(patch);
        }
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
    deleteTask: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
      ],
    }),
    updateTask: builder.mutation<Task, { id: number; title: string; detail?: string; scheduledTime?: string }>({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      async onQueryStarted({ id, title, detail, scheduledTime }, { dispatch, queryFulfilled, getState }) {
        const patches: { undo: () => void }[] = [];
        const state = getState() as any;
        for (const key of tasksApi.util.selectCachedArgsForQuery(state, 'getTasks')) {
          const patch = dispatch(
            tasksApi.util.updateQueryData('getTasks', key, (draft) => {
              const task = draft.find((t) => t.id === id);
              if (task) {
                task.title = title;
                if (detail !== undefined) task.detail = detail;
                if (scheduledTime !== undefined) task.scheduledTime = scheduledTime;
              }
            }),
          );
          patches.push(patch);
        }
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useCreateTaskMutation,
  useToggleTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} = tasksApi;
