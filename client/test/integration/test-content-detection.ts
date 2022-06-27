import { expect } from "chai";
import { PackageFile } from "datapm-lib";
import {
    AGE_LABEL,
    CREDIT_CARD_NUMBER,
    DOB_LABEL,
    DRIVERS_LICENSE_LABEL,
    EMAIL_ADDRESS_LABEL,
    ETHNICITY_LABEL,
    GENDER_LABEL,
    GEO_LATITUDE_LABEL,
    GEO_LONGITUDE_LABEL,
    IP_V4_ADDRESS_LABEL,
    IP_V6_ADDRESS_LABEL,
    NPI_LABEL,
    PASSPORT_LABEL,
    SECRET_LABEL,
    PEOPLE_NAMES_LABEL,
    PHONE_NUMBER_LABEL,
    SOCIAL_SECURITY_NUMBER_LABEL,
    USERNAME_LABEL
} from "datapm-client-lib";

import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestPackage,
    createTestUser,
    KEYS,
    loadTestPackageFile,
    removePackageFiles,
    TEST_SOURCE_FILES
} from "./test-utils";

describe("Content Detection Tests", async function () {
    let packageA: PackageFile;

    before(async () => {
        resetConfiguration();

        const userAClient = await createTestUser();
        const apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });

        try {
            await createTestPackage(
                TEST_SOURCE_FILES.FILE21,
                false,
                "package-a",
                "Package A",
                JSON.stringify({ quote: '"' }),
                [
                    {
                        message: "What does each content-detection record represent?",
                        input: "\n"
                    },
                    {
                        message: "Do you want to specify units for the",
                        input: "n" + KEYS.ENTER
                    }
                ]
            );

            packageA = loadTestPackageFile("package-a");
        } catch (error) {
            console.log(JSON.stringify(error));
            throw error;
        }
    });

    after(() => {
        removePackageFiles(["package-a"]);

        resetConfiguration();
    });

    it("Should detect SSN", async function () {
        expect(
            packageA.schemas[0].properties?.ssn.types.string?.contentLabels?.find(
                (cl) => cl.label === SOCIAL_SECURITY_NUMBER_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Credit Card Numbers", async function () {
        expect(
            packageA.schemas[0].properties?.creditCardNumbers.types.integer?.contentLabels?.find(
                (cl) => cl.label === CREDIT_CARD_NUMBER
            ) != null
        ).equal(true);
    });

    it("Should detect IP V6 Addresses", async function () {
        expect(
            packageA.schemas[0].properties?.ipV6Address.types.string?.contentLabels?.find(
                (cl) => cl.label === IP_V6_ADDRESS_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect IP V4 Addresses", async function () {
        expect(
            packageA.schemas[0].properties?.scentenceWithIPAddress.types.string?.contentLabels?.find(
                (cl) => cl.label === IP_V4_ADDRESS_LABEL
            ) != null
        ).equal(true);
        expect(
            packageA.schemas[0].properties?.ipv4Address.types.string?.contentLabels?.find(
                (cl) => cl.label === IP_V4_ADDRESS_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Phone Numbers", async function () {
        expect(
            packageA.schemas[0].properties?.phoneNumberStrings.types.string?.contentLabels?.find(
                (cl) => cl.label === PHONE_NUMBER_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Persons Names", async function () {
        expect(
            packageA.schemas[0].properties?.firstName.types.string?.contentLabels?.find(
                (cl) => cl.label === PEOPLE_NAMES_LABEL
            ) != null
        ).equal(true);

        /* expect(
            packageA.schemas[0].properties?.lastName.types.string.contentLabels?.find(
                (cl) => cl.label === PEOPLE_NAMES_LABEL
            ) != null
        ).equal(true); */
    });

    it("Should detect Email Addresses", async function () {
        expect(
            packageA.schemas[0].properties?.emailAddress.types.string?.contentLabels?.find(
                (cl) => cl.label === EMAIL_ADDRESS_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Gender property names", async function () {
        expect(
            packageA.schemas[0].properties?.sex.types.string?.contentLabels?.find((cl) => cl.label === GENDER_LABEL) !=
                null
        ).equal(true);

        expect(
            packageA.schemas[0].properties?.gender.types.string?.contentLabels?.find(
                (cl) => cl.label === GENDER_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect DOB property names", async function () {
        expect(
            packageA.schemas[0].properties?.dob.types.string?.contentLabels?.find((cl) => cl.label === DOB_LABEL) !=
                null
        ).equal(true);

        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.date_Of_birth.types.string?.contentLabels?.find(
                (cl) => cl.label === DOB_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Driverse license property names", async function () {
        expect(
            packageA.schemas[0].properties?.driversLicense.types.integer?.contentLabels?.find(
                (cl) => cl.label === DRIVERS_LICENSE_LABEL
            ) != null
        ).equal(true);

        expect(
            packageA.schemas[0].properties?.dl.types.integer?.contentLabels?.find(
                (cl) => cl.label === DRIVERS_LICENSE_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect age property names", async function () {
        expect(
            packageA.schemas[0].properties?.age.types.integer?.contentLabels?.find((cl) => cl.label === AGE_LABEL) !=
                null
        ).equal(true);
    });

    it("Should detect username property names", async function () {
        expect(
            packageA.schemas[0].properties?.username.types.string?.contentLabels?.find(
                (cl) => cl.label === USERNAME_LABEL
            ) != null
        ).equal(true);
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.user_name.types.string?.contentLabels?.find(
                (cl) => cl.label === USERNAME_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect race/ethnicity property names", async function () {
        expect(
            packageA.schemas[0].properties?.race.types.string?.contentLabels?.find(
                (cl) => cl.label === ETHNICITY_LABEL
            ) != null
        ).equal(true);
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.ethnicity.types.string?.contentLabels?.find(
                (cl) => cl.label === ETHNICITY_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect password property names", async function () {
        expect(
            packageA.schemas[0].properties?.Password.types.string?.contentLabels?.find(
                (cl) => cl.label === SECRET_LABEL
            ) != null
        ).equal(true);
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.secret.types.string?.contentLabels?.find(
                (cl) => cl.label === SECRET_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect passport property names", async function () {
        expect(
            packageA.schemas[0].properties?.Passport.types.integer?.contentLabels?.find(
                (cl) => cl.label === PASSPORT_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect NPI property names", async function () {
        expect(
            packageA.schemas[0].properties?.NPI.types.integer?.contentLabels?.find((cl) => cl.label === NPI_LABEL) !=
                null
        ).equal(true);
    });

    it("Should detect GEO property names", async function () {
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.geo_latitude.types.number?.contentLabels?.find(
                (cl) => cl.label === GEO_LATITUDE_LABEL
            ) != null
        ).equal(true);

        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.longitude.types.number?.contentLabels?.find(
                (cl) => cl.label === GEO_LONGITUDE_LABEL
            ) != null
        ).equal(true);
    });
});
