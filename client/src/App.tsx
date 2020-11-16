import React, { useMemo } from 'react';
import { ApolloProvider, useQuery } from '@apollo/client';
import client from './graphql';
import Home from './screens/Home';
import Login from './screens/Login';
import { ME } from './graphql/queries';
import { AppContext } from './constants';

const Main = () => {
  const { data, loading, refetch } = useQuery(ME, {
    notifyOnNetworkStatusChange: true,
  });

  const appContext = useMemo(
    () => ({
      reloadUser: async () => {
        await refetch();
      },
    }),
    []
  );

  if (loading) return <p>Loading...</p>;

  return (
    <AppContext.Provider value={appContext}>
      {data?.me.id ? <Home /> : <Login />}
    </AppContext.Provider>
  );
};

const App = () => {
  return (
    <ApolloProvider client={client}>
      <Main />
    </ApolloProvider>
  );
};

export default App;
