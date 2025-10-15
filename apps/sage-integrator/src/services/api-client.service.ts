import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client/core';
import { AuthCredentials } from '@chapman/shared-types';
import { generateAuthHeaders } from '@chapman/utils';
import fetch from 'cross-fetch';

/**
 * This link acts as a "middleware" for each GraphQL request.
 * Its responsibility is to inject the necessary authentication headers before
 * the request is sent to the server.
 */
const authLink = new ApolloLink((operation, forward) => {
  // Get the credentials from environment variables.
  // This is the only part of the service that interacts directly with 'process.env'.
  const credentials: AuthCredentials = {
    appKey: process.env.APP_KEY!,
    clientId: process.env.CLIENT_ID!,
    appSecret: process.env.APP_SECRET!,
  };

  // Create the header values
  const authHeader = generateAuthHeaders(credentials);

  // Add the headers to the actual context
  operation.setContext({
    headers: {
      ...operation.getContext().headers,
      ...authHeader,
    },
  });

  // Pass the modified request to the next link in the chain
  return forward(operation);
});

/**
 * This link is responsible for making the actual HTTP network call.
 */
const httpLink = new HttpLink({
  // The API URL is also read from environment variables for flexibility.
  uri: process.env.GRAPHQL_API_URL || 'http://localhost:3000/graphql',
  // It's necessary to provide a 'fetch' implementation in Node.js environments.
  fetch,
});

/**
 * The exported instance of ApolloClient.
 * It is constructed by combining our links. The order is important:
 * the request passes first through the authLink and THEN through the httpLink.
 * Any command in CLI that needs to communicate with the API will import
 * this instance.
 */
export const apiClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
