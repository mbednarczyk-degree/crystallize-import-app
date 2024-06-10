import { ClientInterface } from '@crystallize/js-api-client';
import { Tenant } from '@crystallize/schema';

type Deps = {
    apiClient: ClientInterface;
};

interface TenantData extends Tenant {
    availableLanguages: {
        name: string;
        code: string;
    }[];
}

export const fetchTenant = async ({ apiClient }: Deps): Promise<TenantData> => {
    if (!apiClient.config.tenantId) {
        throw new Error('tenantId not set on the ClientInterface.');
    }
    const query = `#graphql
        query GET_TENANT($tenantId: ID!) {
          tenant {
            get(id: $tenantId) {
              availableLanguages {
                name
                code
              }
              defaults {
                language
              }
            }
          }
        }
    `;
    const res = await apiClient.pimApi(query, {
        tenantId: apiClient.config.tenantId,
    });
    return res?.tenant?.get;
};
