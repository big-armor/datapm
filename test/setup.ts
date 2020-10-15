import * as path from "path";
import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
  Wait,
} from "testcontainers";
import { expect } from "chai";
import {
  ApolloClient,
  ApolloQueryResult,
  InMemoryCache,
  NormalizedCacheObject,
  gql,
  HttpLink,
} from "@apollo/client/core";
import fetch from "cross-fetch";
import {
  Catalog,
  Maybe,
  MyCatalogsQuery,
  User,
  MyCatalogsDocument,
  CreateMeDocument,
  LoginDocument,
} from "./registry-client";

let environment: StartedDockerComposeEnvironment;

before(async () => {
  const composeFilePath = path.resolve("docker/");
  const composeFile = "docker-compose.yml";

  console.log(composeFilePath + "/" + composeFile);
  environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    .withWaitStrategy(
      "postgres",
      Wait.forLogMessage('listening on IPv4 address "0.0.0.0", port 5432')
    )
    .withWaitStrategy(
      "datapm-registry",
      Wait.forLogMessage("🚀 Server ready at http://localhost:4000")
    )
    .up();

  /*
const registryContainer = environment.getContainer("datapm-registry");
  const stream = await registryContainer.logs();
    stream
        .on("data", line => console.log(line))
        .on("err", line => console.error(line))
        .on("end", () => console.log("Stream closed"));
  */

  // The "Wait" strategy above doesn't appear to actually wait for the container to start
  await new Promise((r) => {
    setTimeout(async () => {
      r();
    }, 10000);
  });
});

after(async () => {
  if (environment) environment.stop();
});

function createAnonymousClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: "http://localhost:4000/graphql", fetch }),
  });
}

/** creates a new user and returns an apollo client for their session */
async function createUser(
  firstName: string,
  lastName: string,
  username: string,
  emailAddress: string,
  password: string
): Promise<ApolloClient<NormalizedCacheObject>> {
  return await new Promise((resolve, reject) => {
    let client = createAnonymousClient();

    client
      .mutate({
        mutation: CreateMeDocument,
        variables: {
          value: {
            firstName: firstName,
            lastName: lastName,
            username: username,
            emailAddress: emailAddress,
            password: password,
          },
        },
      })
      .catch((error) => {
        reject(error);
      })
      .then((result) => {
        let token = result!["data"].createMe;
        console.log(JSON.stringify(result, null, 1));

        let client = new ApolloClient({
          cache: new InMemoryCache(),
          link: new HttpLink({
            uri: "http://localhost:4000/graphql",
            headers: {
              Accept: "charset=utf-8",
              Authorization: "Bearer " + token,
            },
            fetch,
          }),
        });

        resolve(client);
      });
  });
}

describe("Authentication Tests", async () => {
  let anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
  let userAClient: ApolloClient<NormalizedCacheObject>;
  let userBClient: ApolloClient<NormalizedCacheObject>;

  before(async () => {
    expect(anonymousClient).to.exist;
  });

  it("Login for incorrect user should fail", async () => {
    let loginFailed = false;

    anonymousClient
      .mutate({
        mutation: LoginDocument,
        variables: {
          username: "test",
          password: "test1234",
        },
      })
      .catch((error) => {
        loginFailed = true;
      })
      .then((result) => {
        expect(
          loginFailed,
          "No user should be returned, because they are not loggedin"
        ).equal(true);
      });
  });

  it("Password too short test", async function () {
    await createUser("Password", "TooShort", "willFail", "fail@fail.com", "abc")
      .catch((error) => {
        console.error(JSON.stringify(error, null, 1));
      })
      .then((client) => {
        expect(
          true,
          "Password was too short, and should have failed to create user"
        ).equal(false);
      });
  });

  it("Create users A & B", async function () {
    userAClient = await createUser(
      "FirstA",
      "LastA",
      "testA",
      "testA@test.datapm.io",
      "passwordA"
    );
    userBClient = await createUser(
      "FirstB",
      "LastB",
      "testB",
      "testB@test.datapm.io",
      "passwordB"
    );
    expect(userAClient).to.exist;
    expect(userBClient).to.exist;
  });

  it("Get Users A & B", async function () {});

  it("Get catalogs for user A & B", async function () {
    return userAClient
      .query<MyCatalogsQuery>({
        query: MyCatalogsDocument,
      })
      .catch((error) => {
        console.error(error);
        expect(true, "getting user catalogs failed").equal(false);
      })
      .then((result: ApolloQueryResult<MyCatalogsQuery>) => {
        expect(result).to.exist;

        let catalogs = result!.data.myCatalogs;

        expect(catalogs.length).equal(1);

        expect(catalogs[0].identifier.catalogSlug == "testA");
        expect(catalogs[0].isPublic).equal(false);
      });
  });
});
