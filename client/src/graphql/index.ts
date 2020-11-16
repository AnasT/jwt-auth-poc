import { setContext } from '@apollo/client/link/context';
import {
  ApolloClient,
  createHttpLink,
  from,
  fromPromise,
  InMemoryCache,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { getAccessToken, setAccessToken } from '../utils';
import {REFRESH_TOKEN} from "./mutations";

let isRefreshing = false;
let pendingRequests: any = [];

const resolvePendingRequests = () => {
  pendingRequests.map((callback: any) => callback());
  pendingRequests = [];
};

const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      for (let err of graphQLErrors) {
        switch (err.extensions!.code) {
          case 'UNAUTHENTICATED':
            let forward$;

            if (!isRefreshing) {
              isRefreshing = true;
              forward$ = fromPromise(
                client
                  .mutate({
                    mutation: REFRESH_TOKEN,
                  })
                  .then(({ data: { refreshToken } }) => {
                    setAccessToken(refreshToken);
                    return true;
                  })
                  .then(() => {
                    resolvePendingRequests();
                    return true;
                  })
                  .catch(() => {
                    pendingRequests = [];
                    return false;
                  })
                  .finally(() => {
                    isRefreshing = false;
                  })
              );
            } else {
              forward$ = fromPromise(
                new Promise(resolve => {
                  pendingRequests.push(() => resolve());
                })
              );
            }

            return forward$.flatMap(() => forward(operation));
          default:
            console.log(
              `[GraphQL error]: Message: ${err.message}, Location: ${err.locations}, Path: ${err.path}`
            );
        }
      }
    }

    if (networkError) console.log(`[Network error]: ${networkError}`);
  }
);

const httpLink = createHttpLink({
  uri: 'http://localhost:4000',
  credentials: 'include',
});

const authLink = setContext(async (operation, { headers }) => {
  const token = getAccessToken();

  return {
    headers: {
      ...headers,
      authorization: `Bearer ${token}`,
    },
  };
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
});

export default client;
