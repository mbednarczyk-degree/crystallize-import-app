import { Shape } from '@crystallize/schema';
import { requirePimAwareApiClient } from '~/core.server/auth.server';
import { fetchFlows } from './fetch-flows';
import { fetchFolders } from './fetch-folders';
import { fetchItem, FetchItemArg } from './fetch-item';
import { fetchTenant } from './fetch-language';
import { fetchProductVariants, FetchProductVariantsArg } from './fetch-product-variants';
import { fetchProductsById, FetchProductsByIdArg } from './fetch-products';
import { fetchShapes } from './fetch-shapes';
import { fetchValidationsSchema } from './fetch-validations-schema';
import { pushItemToFlow, PushItemToFlowItemArg } from './push-item-to-flow';

export default async (request: Request) => {
    const apiClient = await requirePimAwareApiClient(request);
    return {
        apiClient,
        fetchShapes: () => fetchShapes({ apiClient }),
        fetchFolders: (language: string, shapes: Shape[]) => fetchFolders(language, shapes, { apiClient }),
        fetchValidationsSchema: () => fetchValidationsSchema({ apiClient }),
        fetchFlows: () => fetchFlows({ apiClient }),
        pushItemToFlow: (item: PushItemToFlowItemArg, stageId: string) => pushItemToFlow(item, stageId, { apiClient }),
        fetchTenant: () => fetchTenant({ apiClient }),
        fetchItem: ({ filter, language }: FetchItemArg) => fetchItem({ filter, language }, { apiClient }),
        fetchProductVariants: ({ skus, language }: FetchProductVariantsArg) =>
            fetchProductVariants({ skus, language }, { apiClient }),
        fetchProductsById: ({ ids, language }: FetchProductsByIdArg) =>
            fetchProductsById({ ids, language }, { apiClient }),
    };
};
