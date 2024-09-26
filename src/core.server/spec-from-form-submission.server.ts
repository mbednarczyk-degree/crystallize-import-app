import {
    JSONContentChunk,
    JSONItem,
    type JSONComponentContent,
    type JSONImage,
    type JSONProduct,
    type JSONProductVariant,
} from '@crystallize/import-utilities';
import type { ContentChunkComponentConfig, NumericComponentConfig, Shape, ShapeComponent } from '@crystallize/schema';
import { v4 as uuidv4 } from 'uuid';
import { FormSubmission } from '~/contracts/form-submission';
import { FIELD_MAPPINGS } from '~/contracts/ui-types';

const contentForComponent = (component: ShapeComponent, key: string, content: string): any => {
    if (component.type === 'boolean') {
        return !!content;
    }

    if (component.type === 'datetime') {
        return new Date(content).toISOString();
    }

    if (component.type === 'gridRelations') {
        return [...content.split(',').map((name) => ({ name }))];
    }

    if (component.type === 'images') {
        return [...content.split(',').map((src) => ({ src }))];
    }

    if (component.type === 'itemRelations') {
        return [...content.split(',').map((externalReference) => ({ externalReference }))];
    }

    if (component.type === 'location') {
        return {
            lat: Number.parseFloat(content.split(',')[0]),
            long: Number.parseFloat(content.split(',')[1]),
        };
    }

    if (component.type === 'numeric') {
        const unit = (component.config as NumericComponentConfig).units?.[0];
        return {
            number: Number.parseFloat(content),
            ...(unit ? { unit } : {}),
        };
    }

    if (component.type === 'paragraphCollection') {
        return {
            html: content,
        };
    }

    if (component.type === 'singleLine' || component.type === 'richText') {
        return content;
    }

    if (component.type === 'contentChunk') {
        const keyParts = key.split('.');
        const chunkId = keyParts[1];

        const subcomp = (component.config as ContentChunkComponentConfig)?.components?.find((c) => c.id === chunkId);
        return [
            {
                [chunkId]: contentForComponent(subcomp, keyParts.slice(1).join('.'), content),
            },
        ];
    }

    if (component.type === 'selection') {
        const options = (component.config as any).options || [];
        const selectedOptions = content
            .split(',')
            .map((value) => {
                const option = options.find((opt: any) => opt.value === value.trim());
                return option ? option.key : null;
            })
            .filter(Boolean);
        return selectedOptions;
    }

    if (component.type === 'files') {
        return content.split(',').map((src) => ({ src }));
    }

    throw new Error(`Component type "${component.type} is not yet supported for import"`);
};

const mapComponents = (
    row: Record<string, any>,
    mapping: Record<string, string>,
    prefix: 'components' | 'variantComponents',
    shape: Shape,
    fetchedProduct?: JSONItem,
): Record<string, JSONComponentContent> => {
    const validMapping = Object.keys(mapping || {}).reduce(
        (acc: Record<string, string>, key) => {
            if (key && mapping[key]) {
                acc[key] = mapping[key];
            }
            return acc;
        },
        {} as Record<string, string>,
    );

    const emptyContentArray = Object.keys(validMapping).filter((key) => {
        const mapKey = validMapping[key];
        return mapKey && row?.[mapKey] === null && key.split('.')[0] === prefix;
    });
    // @ts-ignore
    const fetchedProductChunks = fetchedProduct?.components?.filter((cmp: any) => cmp.type === 'contentChunk');

    const parsedChunks = fetchedProductChunks
        ?.map((chunk: any) => {
            const content = chunk?.content?.chunks
                ?.flatMap((chunkArray: any) => {
                    return chunkArray?.map((chunk: any) => {
                        if (chunk.type === 'selection') {
                            return {
                                [chunk.componentId]: chunk?.content?.options?.map((option: any) => option.key),
                            };
                        }
                        if (chunk.type === 'files') {
                            return {
                                [chunk.componentId]: chunk?.content?.files?.map((file: any) => ({
                                    src: file.url,
                                })),
                            };
                        }
                        return { [chunk.componentId]: chunk.content };
                    });
                })
                ?.filter((item: any) => {
                    const value = Object.values(item)[0];
                    return value !== null && value !== undefined;
                });

            const reduceFetchedChunkContent = content?.reduce((acc: any, item: any) => ({ ...acc, ...item }), {});
            if (reduceFetchedChunkContent) {
                return { [chunk.componentId]: [reduceFetchedChunkContent] };
            }
        })
        ?.filter(Boolean);

    const componentsMap = Object.entries(mapping || {})
        .filter(([key]) => key.split('.')[0] === prefix)
        .reduce((acc: Record<string, JSONComponentContent>, [key, value]) => {
            const keyParts = key.split('.');
            const componentId = keyParts[1];
            const component = shape[prefix]?.find((cmp) => cmp.id === componentId);
            const content: string = row[value];

            if (!component) {
                console.error('Component does not exist', componentId);
                return acc;
            }

            if (!content) {
                return acc;
            }

            if (component.type === 'contentChunk') {
                const emptyChunkId = emptyContentArray.find((empty) => empty.split('.')[1] === componentId);
                if (acc[componentId]) {
                    // that's normal, we can have multiple content chunks
                    // but the import will only fill the 1st one
                    const existingChunks = acc[componentId] as JSONContentChunk;
                    const existingChunkEntries = existingChunks[0];
                    const newChunkEntries = contentForComponent(component, keyParts.slice(1).join('.'), content)[0];
                    const search = parsedChunks?.find((item: any) => item?.[componentId])?.[componentId]?.[0];
                    //remove from search the empty objects with keys the same as emptycomponentid

                    if (emptyChunkId?.split('.')[1] === componentId && search) {
                        Object.keys(search).forEach((key) => {
                            if (key === emptyChunkId.split('.')[2]) {
                                delete search[key];
                            }
                        });
                    }
                    acc[componentId] = [
                        {
                            ...(search || {}),
                            ...(existingChunkEntries || {}),
                            ...(newChunkEntries || {}),
                        },
                    ];

                    return acc;
                }
                const search = parsedChunks?.find((item: any) => item?.[componentId])?.[componentId]?.[0];
                const newChunkEntries = contentForComponent(component, keyParts.slice(1).join('.'), content)?.[0];

                if (emptyChunkId?.split('.')[1] === componentId && search) {
                    Object.keys(search).forEach((key) => {
                        if (key === emptyChunkId.split('.')[2]) {
                            delete search[key];
                        }
                    });
                }

                acc[componentId] = [
                    {
                        ...(search || {}),
                        ...(newChunkEntries || {}),
                    },
                ];

                return acc;
            }

            const newContent = contentForComponent(component, keyParts.slice(1).join('.'), content);

            acc[componentId] = newContent;

            return acc;
        }, {});

    return componentsMap;
};

type MapVariantOptions = {
    roundPrices?: boolean;
};
const mapVariant = (
    row: Record<string, any>,
    mapping: Record<string, string>,
    shape: Shape,
    fetchedProducts: JSONItem[],
    options?: MapVariantOptions,
): JSONProductVariant => {
    const name = row[mapping[FIELD_MAPPINGS.item.name.key]];
    const sku = row[mapping['variant.sku']];
    const images = row[mapping['variant.images']];
    let price = row[mapping['variant.price']] ? Number.parseFloat(row[mapping['variant.price']]) : undefined;
    const stock = row[mapping['variant.stock']] ? Number.parseFloat(row[mapping['variant.stock']]) : undefined;
    const externalReference = row[mapping[FIELD_MAPPINGS.productVariant.externalReference.key]];

    const attributeKeys = Object.keys(mapping).filter((key) => key.startsWith('variantAttribute.'));
    const attributes: Record<string, string> = attributeKeys.reduce((acc: Record<string, string>, key) => {
        const attr = key.split('.').at(-1) as string;
        acc[attr] = `${row[mapping[key]] || ''}`;
        return acc;
    }, {});

    if (options?.roundPrices && price) {
        price = Math.round(price * 100) / 100;
    }
    const variant: JSONProductVariant = {
        name,
        sku,
        price,
        stock,
        externalReference,
        attributes,
    };

    if (images) {
        variant.images = images.split(',').map(
            (src: string): JSONImage => ({
                src,
            }),
        );
    }
    const fetchedProduct = fetchedProducts.find((product) => {
        const { variants } = product as JSONProduct;
        return variants.some((variant) => variant.sku === sku);
    });
    variant.components = mapComponents(row, mapping, 'variantComponents', shape, fetchedProduct);
    return variant;
};

export const specFromFormSubmission = async (
    submission: FormSubmission,
    shapes: Shape[],
    fetchedProducts: JSONItem[],
) => {
    const { shapeIdentifier, folderPath, rows, mapping, groupProductsBy, subFolderMapping, roundPrices } = submission;

    const shape = shapes.find((s) => s.identifier === shapeIdentifier);
    if (!shape) {
        throw new Error(`Shape ${shapeIdentifier} not found.`);
    }

    const buildExternalReference = (name: string) => {
        return (
            folderPath?.replace(/^\//, '')?.replace(/\//g, '-') +
            '-' +
            name
                ?.replace(/([a-z])([A-Z])/g, '$1-$2')
                ?.replace(/[\s_]+/g, '-')
                ?.toLowerCase()
        );
    };

    const folders = subFolderMapping
        ? rows.reduce((memo: JSONItem[], row) => {
              const depth = subFolderMapping.length;
              for (let d = 0; d < depth; d++) {
                  const column = subFolderMapping[d].column;
                  const name = row[column];
                  const folder = {
                      name,
                      shape: subFolderMapping[d].shapeIdentifier,
                      externalReference: buildExternalReference(name),
                      ...(d === 0
                          ? { parentCataloguePath: folderPath }
                          : { parentExternalReference: buildExternalReference(row[subFolderMapping[d - 1].column]) }),
                  };
                  if (!memo.some((f) => f.externalReference === folder.externalReference)) {
                      memo.push(folder);
                  }
              }
              return memo;
          }, [])
        : [];

    const items: JSONItem[] = folders;

    const findParent = (row: Record<string, any>) => {
        if (subFolderMapping) {
            const last = subFolderMapping.length - 1;
            const folder = folders.find(
                (f) => f.externalReference === buildExternalReference(row[subFolderMapping[last].column]),
            );
            if (folder) {
                return {
                    parentExternalReference: folder.externalReference,
                };
            }
            return { parentCataloguePath: folderPath };
        }
    };

    const processComponent = async (
        component: ShapeComponent,
        keyPrefix: string,
        row: Record<string, any>,
        mapping: Record<string, string>,
        prefix: 'components' | 'variantComponents',
        shape: Shape,
    ) => {
        const key = `${keyPrefix}${component.id}`;
        const value = mapping[key];

        if (value && row[value]) {
            if (component.type === 'images') {
                row[value] = row[value].replace(/,+\s*$/, '');
                const imageUrls = row[value].split(',').map((url: string) => url.trim());
                const validImageUrls = await filterInvalidImages(imageUrls);
                row[value] = validImageUrls.join(',');
            } else if (component.type === 'files') {
                row[value] = row[value].replace(/,+\s*$/, '');
                const fileUrls = row[value].split(',').map((url: string) => url.trim());
                const validFileUrls = await filterInvalidFiles(fileUrls);
                row[value] = validFileUrls.join(',');
            } else if (component.type === 'contentChunk') {
                const contentChunkComponents = (component.config as ContentChunkComponentConfig)?.components || [];
                for (const subComponent of contentChunkComponents) {
                    await processComponent(subComponent, `${key}.`, row, mapping, prefix, shape);
                }
            } else {
                // Handling other component types if needed
            }
        } else if (component.type === 'contentChunk') {
            // If the `contentChunk` component does not have a direct mapping, but may have nested components
            const contentChunkComponents = (component.config as ContentChunkComponentConfig)?.components || [];
            for (const subComponent of contentChunkComponents) {
                await processComponent(subComponent, `${key}.`, row, mapping, prefix, shape);
            }
        }
    };

    const rowsWithValidFilesAndImages = await Promise.all(
        rows.map(async (row) => {
            const imagesField = mapping['variant.images'];
            if (imagesField && row[imagesField]) {
                row[imagesField] = row[imagesField].replace(/,+\s*$/, '');
                const imageUrls = row[imagesField].split(',').map((url: string) => url.trim());
                const validImageUrls = await filterInvalidImages(imageUrls);
                row[imagesField] = validImageUrls.join(',');
            }

            for (const [key, value] of Object.entries(mapping)) {
                if ((key.startsWith('components.') || key.startsWith('variantComponents.')) && value && row[value]) {
                    const keyParts = key.split('.');
                    const prefix = keyParts[0] as 'components' | 'variantComponents';
                    const componentId = keyParts[1];
                    const component = shape[prefix]?.find((cmp) => cmp.id === componentId);

                    if (component) {
                        if (component.type === 'contentChunk') {
                            const contentChunkComponents =
                                (component.config as ContentChunkComponentConfig)?.components || [];
                            for (const subComponent of contentChunkComponents) {
                                await processComponent(
                                    subComponent,
                                    `${keyParts.slice(0, 2).join('.')}.`,
                                    row,
                                    mapping,
                                    prefix,
                                    shape,
                                );
                            }
                        } else if (component.type === 'images') {
                            row[value] = row[value].replace(/,+\s*$/, '');
                            const imageUrls = row[value].split(',').map((url: string) => url.trim());
                            const validImageUrls = await filterInvalidImages(imageUrls);
                            row[value] = validImageUrls.join(',');
                        } else if (component.type === 'files') {
                            row[value] = row[value].replace(/,+\s*$/, '');
                            const fileUrls = row[value].split(',').map((url: string) => url.trim());
                            const validFileUrls = await filterInvalidFiles(fileUrls);
                            row[value] = validFileUrls.join(',');
                        }
                    }
                }
            }

            return row;
        }),
    );

    if (shape.type === 'product') {
        const variants = rowsWithValidFilesAndImages.map((row) =>
            mapVariant(row, mapping, shape, fetchedProducts, {
                roundPrices: !!roundPrices,
            }),
        );
        const mapProduct = (obj: Record<string, JSONProduct>, row: Record<string, any>, i: number) => {
            const productName = row[mapping['item.name']];
            const sku = row[mapping['variant.sku']];
            const fetchedProduct = fetchedProducts?.find((product) => {
                const { variants } = product as JSONProduct;
                return variants.some((variant) => variant.sku === sku);
            });
            const productComponentMap = mapComponents(row, mapping, 'components', shape, fetchedProduct);

            let product: JSONProduct = {
                name: productName || variants[i].name,
                shape: shape.identifier,
                vatType: 'No Tax',
                variants: [variants[i]],
                externalReference: buildExternalReference(productName),
                components: productComponentMap,
                ...findParent(row),
            };

            if (groupProductsBy && row[groupProductsBy]) {
                if (obj[row[groupProductsBy]]) {
                    product = obj[row[groupProductsBy]];
                    product.variants = product.variants.concat(variants[i]);
                }
                obj[row[groupProductsBy]] = product;
            } else {
                obj[uuidv4()] = product;
            }
            return obj;
        };
        items.push(...Object.values(rows.reduce(mapProduct, {})));
    } else {
        items.push(
            ...rowsWithValidFilesAndImages.map((row) => {
                const fetchedProduct = fetchedProducts.find((product) => {
                    const { variants } = product as JSONProduct;
                    return variants.some((variant) => variant.sku === row[mapping['variant.sku']]);
                });
                const product = {
                    name: row[mapping['item.name']],
                    shape: shape.identifier,
                    components: mapComponents(row, mapping, 'components', shape, fetchedProduct),
                    ...findParent(row),
                };
                return product;
            }),
        );
    }

    return {
        items,
    };
};

const isValidImage = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        return response.status === 200 && contentType?.startsWith('image/') === true;
    } catch (error) {
        console.error(`Error fetching image URL: ${url}`, error);
        return false;
    }
};

const isValidFile = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.status === 200;
    } catch (error) {
        console.error(`Error fetching file URL: ${url}`, error);
        return false;
    }
};

const filterInvalidImages = async (images: string[]): Promise<string[]> => {
    const validImages = [];
    for (const image of images) {
        if (await isValidImage(image)) {
            validImages.push(image);
        }
    }
    return validImages;
};

const filterInvalidFiles = async (files: string[]): Promise<string[]> => {
    const validFiles = [];
    for (const file of files) {
        if (await isValidFile(file)) {
            validFiles.push(file);
        }
    }
    return validFiles;
};
