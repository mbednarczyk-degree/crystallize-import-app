import { ClientInterface } from '@crystallize/js-api-client';

type Deps = {
    apiClient: ClientInterface;
};
export type FetchProductsByIdArg = {
    ids: string[];
    language: string;
};
export const fetchProductsById = async ({ ids, language }: FetchProductsByIdArg, { apiClient }: Deps) => {
    const queries = ids.map((id, index) => {
        return `p${index}: 
      product {
        get(id: "${id}", language: "${language}") {
          name
          variants {
            sku
            components {
              componentId
              name
              type
              content {
                ... on NumericContent {
                  number
                }
                ... on SingleLineContent {
                  text
                }
                ... on RichTextContent {
                  json
                  html
                  plainText
                }
                ... on SelectionContent {
                  options {
                    key
                    value
                  }
                }
                ... on FileContent {
                  files {
                    url
                  }
                }
              }
            }
          }
          components {
            componentId
            type
            content {
              ... on NumericContent {
                number
              }
              ... on SingleLineContent {
                text
              }
              ... on RichTextContent {
                json
                html
                plainText
              }
              ... on SelectionContent {
                options {
                  key
                  value
                }
              }
              ... on FileContent {
                files {
                  url
                }
              }
              ... on ContentChunkContent {
                chunks {
                  componentId
                  type
                  content {
                    ... on NumericContent {
                      number
                    }
                    ... on SingleLineContent {
                      text
                    }
                    ... on RichTextContent {
                      json
                      html
                      plainText
                    }
                    ... on SelectionContent {
                      options {
                        key
                        value
                      }
                    }
                    ... on FileContent {
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
      }`;
    });

    const query = `#graphql
    query FETCH_PRODUCTS_BY_ID {
      ${queries.join('\n')}
    }`;

    const res = await apiClient.pimApi(query, {
        language,
    });

    return res;
};
