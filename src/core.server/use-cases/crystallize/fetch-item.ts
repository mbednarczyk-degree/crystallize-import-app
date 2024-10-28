import { JSONItem } from '@crystallize/import-utilities';
import { ClientInterface } from '@crystallize/js-api-client';

type Deps = {
    apiClient: ClientInterface;
};

export type FetchItemArg = {
    filter: {
        externalReferences: string[];
    };
    language: string;
};
export type FetchItemResponse = {
    edges: {
        node: JSONItem;
    }[];
};
export const fetchItem = async (
    { filter, language }: FetchItemArg,
    { apiClient }: Deps,
): Promise<FetchItemResponse> => {
    if (!apiClient.config.tenantId) {
        throw new Error('tenantId not set on the ClientInterface.');
    }
    const query = `#graphql
    query FETCH_ITEM($language: String!, $filter: ItemListFilter!) {
      items(language: $language, filter: $filter) {
        ... on ItemConnection {
          edges { 
            node {
              externalReference
              components {
                type
                componentId
                content {
                  ... on ContentChunkComponentContent {
                    chunks {
                      ... on Component {
                        componentId
                        type
                        content {
                          ... on NumericComponentContent {
                            number
                            unit
                          }
                          ... on SingleLineComponentContent {
                            text
                          }
                          ... on RichTextComponentContent {
                            json
                            html
                            plainText
                          }
                          ... on SelectionComponentContent {
                            options {
                              value
                            }
                          }
                          ... on FilesComponentContent {
                            files {
                              url
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const res = await apiClient.nextPimApi(query, {
        filter,
        language,
    });

    if (!res?.items || res?.items.length === 0) {
        throw new Error(`Failed to get item`);
    }

    return res.items;
};
