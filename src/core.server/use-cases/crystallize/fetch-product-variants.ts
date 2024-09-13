import { ClientInterface } from '@crystallize/js-api-client';
type Deps = {
    apiClient: ClientInterface;
};
export type FetchProductVariantsArg = {
    skus: string[];
    language: string;
};
export const fetchProductVariants = async ({ skus, language }: FetchProductVariantsArg, { apiClient }: Deps) => {
    if (!apiClient.config.tenantId) {
        throw new Error('tenantId not set on the ClientInterface.');
    }

    const query = `#graphql
      query FETCH_PRODUCT_VARIANTS($skus: [String!], $language: String!, $tenantId: ID!) {
        product {
          getVariants(skus: $skus, language: $language, tenantId: $tenantId) {
            productId
          }
        }
      }`;

    const res = await apiClient.pimApi(query, {
        skus,
        language,
        tenantId: apiClient.config.tenantId,
    });

    return res.product.getVariants;
};
