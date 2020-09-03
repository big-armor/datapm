import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache,ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { getTokenDesc } from 'graphql/language/lexer';
import { onError } from "@apollo/client/link/error";


const uri = '/graphql';

export function provideApollo(httpLink: HttpLink) {
  const basic = setContext((operation, context) => ({
    headers: {
      Accept: 'charset=utf-8'
    }
  }));

  // Get the authentication token from local storage if it exists

  const getHeaders = () => {
    const token = localStorage.getItem('jwt');

    if(token == null)
      return {}

    return {
      Authorization: `Bearer ${token}`
    }
  }

 
  const auth = setContext((operation, context) => ({
      headers: getHeaders()
    }));

    const errorLink = onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors)
        graphQLErrors.map(({ message, locations, path }) =>
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          ),
        );
    
      if (networkError) console.log(`[Network error]: ${networkError}`);
    });
 
  const link = ApolloLink.from([basic, auth, httpLink.create({ uri }),errorLink]);
  const cache = new InMemoryCache();

  return {
    link,
    cache,
    defaultOptions: {
      query: {
        errorPolicy: 'all'
      },
      watchQuery: {
        errorPolicy: 'all'
      },
      mutate: {
        errorPolicy: 'all'
      }
    }
  }
}

@NgModule({
  exports: [
    HttpClientModule,
  ],
  providers: [{
    provide: APOLLO_OPTIONS,
    useFactory: provideApollo,
    deps: [HttpLink]
  }]
})
export class GraphQLModule {}