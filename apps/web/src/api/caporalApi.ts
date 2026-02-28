import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AnimalProfile,
  Batch,
  BatchHealthEvent,
  BatchProjection,
  BatchWeighIn,
  DietRun,
  Ingredient,
  IngredientPrice,
  RagInteraction,
  SellSignal,
} from '../types';

export const caporalApi = createApi({
  reducerPath: 'caporalApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  }),
  tagTypes: ['Ingredient', 'Profile', 'DietRun', 'Interaction', 'Batch', 'Projection'],
  endpoints: (builder) => ({
    getIngredients: builder.query<Ingredient[], void>({
      query: () => '/ingredients',
      providesTags: ['Ingredient'],
    }),
    updateIngredient: builder.mutation<Ingredient, { id: string; body: Partial<Ingredient> }>({
      query: ({ id, body }) => ({
        url: `/ingredients/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Ingredient'],
    }),
    postPrice: builder.mutation<IngredientPrice, { ingredientId: string; body: Partial<IngredientPrice> }>({
      query: ({ ingredientId, body }) => ({
        url: `/ingredients/${ingredientId}/prices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Ingredient'],
    }),

    getProfiles: builder.query<AnimalProfile[], void>({
      query: () => '/profiles',
      providesTags: ['Profile'],
    }),

    getBatches: builder.query<Batch[], void>({
      query: () => '/batches',
      providesTags: ['Batch'],
    }),
    createBatch: builder.mutation<Batch, {
      name: string;
      breed?: string;
      headCount: number;
      initialWeightKg: number;
      targetSaleWeightKg?: number;
      startDate?: string;
      notes?: string;
    }>({
      query: (body) => ({
        url: '/batches',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Batch'],
    }),
    updateBatch: builder.mutation<Batch, { id: string; body: Partial<Batch> }>({
      query: ({ id, body }) => ({
        url: `/batches/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Batch'],
    }),
    addBatchWeighIn: builder.mutation<BatchWeighIn, {
      batchId: string;
      body: {
        measuredAt: string;
        averageWeightKg: number;
        notes?: string;
      };
    }>({
      query: ({ batchId, body }) => ({
        url: `/batches/${batchId}/weigh-ins`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Batch', 'Projection'],
    }),
    getBatchWeighIns: builder.query<BatchWeighIn[], string>({
      query: (batchId) => `/batches/${batchId}/weigh-ins`,
      providesTags: ['Batch'],
    }),
    addBatchHealthEvent: builder.mutation<BatchHealthEvent, {
      batchId: string;
      body: {
        eventDate: string;
        eventType: string;
        severity?: 'LOW' | 'MEDIUM' | 'HIGH';
        notes?: string;
      };
    }>({
      query: ({ batchId, body }) => ({
        url: `/batches/${batchId}/health-events`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Batch'],
    }),

    generateDiet: builder.mutation<DietRun, { animalProfileId: string; maxSolveMs?: number; batchId?: string }>({
      query: (body) => ({
        url: '/diets/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DietRun'],
    }),
    generateBatchWeeklyDiet: builder.mutation<DietRun, {
      batchId: string;
      body: {
        animalProfileId: string;
        maxSolveMs?: number;
        horizonDays?: number;
        salePriceMxnPerKg?: number;
        purchasePriceMxnPerKg?: number;
      };
    }>({
      query: ({ batchId, body }) => ({
        url: `/batches/${batchId}/diets/generate-weekly`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DietRun', 'Projection'],
    }),
    getDietRuns: builder.query<DietRun[], void>({
      query: () => '/diets',
      providesTags: ['DietRun'],
    }),

    getBatchProjection: builder.query<BatchProjection, { batchId: string; horizonDays?: number }>({
      query: ({ batchId, horizonDays }) => {
        const params = new URLSearchParams();
        if (horizonDays) {
          params.set('horizonDays', String(horizonDays));
        }
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return `/batches/${batchId}/projections${suffix}`;
      },
      providesTags: ['Projection'],
    }),
    getBatchSellSignal: builder.query<SellSignal, { batchId: string; horizonDays?: number }>({
      query: ({ batchId, horizonDays }) => {
        const params = new URLSearchParams();
        if (horizonDays) {
          params.set('horizonDays', String(horizonDays));
        }
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return `/batches/${batchId}/sell-signal${suffix}`;
      },
      providesTags: ['Projection'],
    }),

    askAssistant: builder.mutation<RagInteraction, { dietRunId: string; question: string; topK?: number }>({
      query: (body) => ({
        url: '/assistant/ask',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Interaction'],
    }),
    getInteractions: builder.query<RagInteraction[], string>({
      query: (dietRunId) => `/assistant/diet-runs/${dietRunId}/interactions`,
      providesTags: ['Interaction'],
    }),
  }),
});

export const {
  useGetIngredientsQuery,
  useUpdateIngredientMutation,
  usePostPriceMutation,
  useGetProfilesQuery,
  useGetBatchesQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useAddBatchWeighInMutation,
  useGetBatchWeighInsQuery,
  useAddBatchHealthEventMutation,
  useGenerateDietMutation,
  useGenerateBatchWeeklyDietMutation,
  useGetDietRunsQuery,
  useGetBatchProjectionQuery,
  useGetBatchSellSignalQuery,
  useAskAssistantMutation,
  useGetInteractionsQuery,
} = caporalApi;
