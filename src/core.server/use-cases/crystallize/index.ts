import { Shape } from '@crystallize/schema';
import { requirePimAwareApiClient } from '~/core.server/auth.server';
import { fetchFlows } from './fetch-flows';
import { fetchFolders } from './fetch-folders';
import { fetchTenant } from './fetch-language';
import { fetchShapes } from './fetch-shapes';
import { fetchValidationsSchema } from './fetch-validations-schema';
import { PushItemToFlowItemArg, pushItemToFlow } from './push-item-to-flow';

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
    };
};
