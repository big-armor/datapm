import { ApolloClient, gql, NormalizedCacheObject } from "@apollo/client/core";
import { createAnonymousClient, createUser } from "./test-utils";
import { CreatePackageDocument, MeDocument, MyActivityDocument, ActivityLogEventType } from "./registry-client";
import { expect } from "chai";

describe("Activity Log Tests", async () => {
    let userOne: any;
    let userTwo: any;
    let userOneClient: ApolloClient<NormalizedCacheObject>;
    let userTwoClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    before(async () => {
        userOneClient = await createUser(
            "FirstOne",
            "LastOne",
            "testOne-packages",
            "testOne-packages@test.datapm.io",
            "passwordOne!"
        );
        userTwoClient = await createUser(
            "FirstTwo",
            "LastTwo",
            "testTwo-packages",
            "testTwo-packages@test.datapm.io",
            "passwordTwo!"
        );

        const userOneResponse = await userOneClient.query({
            query: MeDocument
        });

        const userTwoResponse = await userTwoClient.query({
            query: MeDocument
        });

        userOne = userOneResponse.data!.me;
        userTwo = userTwoResponse.data!.me;

        await userOneClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testOne-packages",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });
    });

    it("Should allow user to get own activity", async function () {
        const response = await userOneClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.PACKAGE_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.exist;
        expect(response.data.myActivity).to.exist;
        expect(response.data.myActivity.logs.length).to.equal(2);
        expect(response.data.myActivity.logs[1]?.user?.username).to.equal(userOne.username);
    });

    it("Should return no activity", async function () {
        const response = await userTwoClient.query({
            query: MyActivityDocument,
            variables: { filter: { eventType: [ActivityLogEventType.PACKAGE_CREATED], limit: 100, offset: 0 } }
        });

        expect(response.data).to.exist;
        expect(response.data.myActivity).to.exist;
        expect(response.data.myActivity.logs?.length).to.equal(1);
        expect(response.data.myActivity.logs[0]?.user?.username).to.equal(userOne.username);
    });
});
