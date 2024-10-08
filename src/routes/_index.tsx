import { json, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { State } from '~/contracts/ui-types';
import CrystallizeAPI from '~/core.server/use-cases/crystallize';
import { App } from '~/ui/import/App';
import { ImportContextProvider } from '~/ui/import/provider';

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const api = await CrystallizeAPI(request);
    const [shapes, validationRules] = await Promise.all([api.fetchShapes(), api.fetchValidationsSchema()]);
    const channels = shapes.reduce((memo: Record<string, string[]>, shape) => {
        const ch = validationRules?.[shape.identifier]?.channels ?? [];
        return {
            ...memo,
            [shape.identifier]: ch,
        };
    }, {});
    const tenant = await api.fetchTenant();

    const [folders, flows] = await Promise.all([api.fetchFolders(tenant.defaults.language, shapes), api.fetchFlows()]);

    return json({
        shapes,
        flows,
        channels,
        folders,
        tenant,
    });
};

export default function Index() {
    const { shapes, folders, flows, channels, tenant } = useLoaderData<typeof loader>();
    const initialState: State = {
        importId: Math.random().toString(36).substring(7),
        shapes,
        folders,
        flows,
        subFolderMapping: [],
        selectedShape: shapes[0],
        selectedFolder: folders[0],
        headers: [],
        attributes: [],
        rows: [],
        channels,
        mapping: {},
        currentLanguage: tenant?.defaults?.language,
        languages: tenant?.availableLanguages,
    };

    if (!shapes || !folders) {
        return (
            <div className="empty-screen">
                <span className="loader"></span>
            </div>
        );
    }

    return (
        <ImportContextProvider initialState={initialState}>
            <App />
        </ImportContextProvider>
    );
}
