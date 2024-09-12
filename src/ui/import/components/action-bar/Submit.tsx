import { forwardRef, useRef } from 'react';
import { FormSubmission } from '~/contracts/form-submission';
import { useImport } from '../../provider';

const FlowStagesSelect = forwardRef<HTMLSelectElement, { defaultOption: string }>((props, ref) => {
    const { state } = useImport();
    const { defaultOption } = props;

    return (
        <select className="first:rounded-r-none last:rounded-l-none last:border-r-0" ref={ref} defaultValue={''}>
            <option disabled value={''}>
                {defaultOption}
            </option>
            {state.flows
                .filter((flow) => {
                    if (flow.shapeRestrictions.length === 0) return true;
                    if (flow.shapeRestrictions.includes(state.selectedShape.identifier)) return true;
                })
                .map((flow) => (
                    <optgroup key={flow.identifier} label={flow.name}>
                        {Object.keys(flow.stages).map((identifier) => (
                            <option key={identifier} value={identifier}>
                                {flow.stages[identifier]}
                            </option>
                        ))}
                    </optgroup>
                ))}
        </select>
    );
});

export const Submit = () => {
    const { state, dispatch } = useImport();

    const buttonText = state.rows?.length
        ? `Import ${state.rows.filter((row) => row._import).length} rows`
        : `No rows to import`;

    const publishRef = useRef<HTMLInputElement>(null);
    const roundRef = useRef<HTMLInputElement>(null);
    const validFlowRef = useRef<HTMLSelectElement>(null);
    const invalidFlowRef = useRef<HTMLSelectElement>(null);

    const importData = async () => {
        dispatch.updateLoading(true);
        try {
            const rows = state.rows.filter((row) => row._import);
            const batchSize = 5;
            const totalRows = rows.length;

            for (let i = 0; i < totalRows; i += batchSize) {
                const batchRows = rows.slice(i, i + batchSize);

                const post: FormSubmission = {
                    importId: state.importId,
                    shapeIdentifier: state.selectedShape.identifier,
                    folderPath: state.selectedFolder.tree?.path ?? '/',
                    groupProductsBy: state.groupProductsBy,
                    mapping: state.mapping,
                    rows: batchRows,
                    doPublish: publishRef.current?.checked ?? false,
                    subFolderMapping: state.subFolderMapping,
                    validFlowStage: validFlowRef.current?.value ?? undefined,
                    invalidFlowStage: invalidFlowRef.current?.value ?? undefined,
                    roundPrices: roundRef.current?.checked ?? false,
                };

                const res = await fetch('/api/submit', {
                    method: 'POST',
                    cache: 'no-cache',
                    body: JSON.stringify(post),
                });

                if (res.status !== 200) {
                    const error = await res.json();
                    console.error(error);
                    break;
                } else {
                    const response = await res.json();
                    if (response.success !== true) {
                        console.error('dispatching', response.errors);
                        dispatch.updateMainErrors(response.errors);
                        break;
                    }
                }
            }

            dispatch.updateDone(true);
        } catch (err: any) {
            console.error(err);
        } finally {
            dispatch.updateLoading(false);
        }
    };
    return (
        <>
            <div className="flex flex-col py-2">
                <div>
                    {state.flows.length > 0 && (
                        <>
                            <label className="pb-2 block">Flows</label>
                            <div className="flex items-start ">
                                <FlowStagesSelect ref={validFlowRef} defaultOption="Valid items" />
                                <FlowStagesSelect ref={invalidFlowRef} defaultOption="Invalid items" />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="py-2.5 pl-3">
                <div className="text-xs flex gap-3 pb-2">
                    <label className="flex items-center">
                        <input type="checkbox" ref={publishRef} />
                        <small>Publish</small>
                    </label>
                    <label className="flex items-center">
                        <input type="checkbox" ref={roundRef} />
                        <small>Round Prices</small>
                    </label>
                </div>
                <button
                    className="submit"
                    onClick={importData}
                    type="button"
                    disabled={!state.rows?.length || state.done}
                >
                    {state.done ? 'Import completed' : buttonText}
                </button>
            </div>
        </>
    );
};
