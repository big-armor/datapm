import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client/core";
import { CreateMeDocument, CreateMeMutation, CreateMeMutationVariables } from "./registry-client";
import fetch from "cross-fetch";

export function createAnonymousClient() {
	return new ApolloClient({
		cache: new InMemoryCache(),
		link: new HttpLink({ uri: "http://localhost:4000/graphql", fetch }),

		defaultOptions: {
			query: {
				errorPolicy: "all"
			},
			mutate: {
				errorPolicy: "all"
			},
			watchQuery: {
				errorPolicy: "all"
			}
		}
	});
}

/** creates a new user and returns an apollo client for their session */
export async function createUser(
	firstName: string,
	lastName: string,
	username: string,
	emailAddress: string,
	password: string
): Promise<ApolloClient<NormalizedCacheObject>> {
	return await new Promise((resolve, reject) => {
		let client = createAnonymousClient();
		client
			.mutate<CreateMeMutation, CreateMeMutationVariables>({
				errorPolicy: "all",
				mutation: CreateMeDocument,
				variables: {
					value: {
						firstName: firstName,
						lastName: lastName,
						username: username,
						emailAddress: emailAddress,
						password: password
					}
				}
			})
			.catch((error) => {
				//console.error(JSON.stringify(error,null,1));
				reject(error);
			})
			.then((result) => {
				if (!result) {
					reject("This should never happen");
					return;
				}

				let token = result.data!.createMe;

				let client = new ApolloClient({
					cache: new InMemoryCache(),
					defaultOptions: {
						query: {
							errorPolicy: "all"
						},
						mutate: {
							errorPolicy: "all"
						},
						watchQuery: {
							errorPolicy: "all"
						}
					},
					link: new HttpLink({
						uri: "http://localhost:4000/graphql",
						headers: {
							Accept: "charset=utf-8",
							Authorization: "Bearer " + token
						},
						fetch
					})
				});

				resolve(client);
			});
	});
}
