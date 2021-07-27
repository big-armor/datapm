import { expect } from "chai";
import { loadPackageFileFromDisk, PackageFile } from "datapm-lib";
import { AGE_LABEL } from "../../src/content-detector/AgePropertyNameDetector";
import { CREDIT_CARD_NUMBER } from "../../src/content-detector/CreditCardNumberDetector";
import { DOB_LABEL } from "../../src/content-detector/DateOfBirthPropertyNameDetector";
import { DRIVERS_LICENSE_LABEL } from "../../src/content-detector/DriversLicensePropertyNameDetector";
import { EMAIL_ADDRESS_LABEL } from "../../src/content-detector/EmailContentDetector";
import { ETHNICITY_LABEL } from "../../src/content-detector/EthnicityPropertyNameDetector";
import { GENDER_LABEL } from "../../src/content-detector/GenderPropertyNameDetector";
import { GEO_LATITUDE_LABEL } from "../../src/content-detector/GeoLatitudePropertyNameDetector";
import { GEO_LONGITUDE_LABEL } from "../../src/content-detector/GeoLongitudePropertyNameDetector";
import { IP_V4_ADDRESS_LABEL } from "../../src/content-detector/Ipv4AddressDetector";
import { IP_V6_ADDRESS_LABEL } from "../../src/content-detector/Ipv6AddressDetector";
import { NPI_LABEL } from "../../src/content-detector/NPIPropertyNameDetector";
import { PASSPORT_LABEL } from "../../src/content-detector/PassportPropertyNameDetector";
import { SECRET_LABEL } from "../../src/content-detector/PasswordPropertyNameDetector";
import { PEOPLE_NAMES_LABEL } from "../../src/content-detector/PersonNameDetector";
import { PHONE_NUMBER_LABEL } from "../../src/content-detector/RegexDetector";
import { SOCIAL_SECURITY_NUMBER_LABEL } from "../../src/content-detector/SocialSecurityNumberDetector";
import { USERNAME_LABEL } from "../../src/content-detector/UsernamePropertyNameDetector";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import { createApiKey, createTestPackage, createTestUser, removePackageFiles, TEST_SOURCE_FILES } from "./test-utils";

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
                        input: "n"
                    }
                ]
            );

            packageA = loadPackageFileFromDisk("package-a.datapm.json");
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
            packageA.schemas[0].properties?.ssn.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === SOCIAL_SECURITY_NUMBER_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Credit Card Numbers", async function () {
        expect(
            packageA.schemas[0].properties?.creditCardNumbers.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === CREDIT_CARD_NUMBER
            ) != null
        ).equal(true);
    });

    it("Should detect IP V6 Addresses", async function () {
        expect(
            packageA.schemas[0].properties?.ipV6Address.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === IP_V6_ADDRESS_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect IP V4 Addresses", async function () {
        expect(
            packageA.schemas[0].properties?.scentenceWithIPAddress.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === IP_V4_ADDRESS_LABEL
            ) != null
        ).equal(true);
        expect(
            packageA.schemas[0].properties?.ipv4Address.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === IP_V4_ADDRESS_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Phone Numbers", async function () {
        expect(
            packageA.schemas[0].properties?.phoneNumbers.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === PHONE_NUMBER_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Persons Names", async function () {
        expect(
            packageA.schemas[0].properties?.firstName.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === PEOPLE_NAMES_LABEL
            ) != null
        ).equal(true);

        expect(
            packageA.schemas[0].properties?.lastName.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === PEOPLE_NAMES_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Email Addresses", async function () {
        expect(
            packageA.schemas[0].properties?.emailAddress.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === EMAIL_ADDRESS_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Gender property names", async function () {
        expect(
            packageA.schemas[0].properties?.sex.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === GENDER_LABEL
            ) != null
        ).equal(true);

        expect(
            packageA.schemas[0].properties?.gender.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === GENDER_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect DOB property names", async function () {
        expect(
            packageA.schemas[0].properties?.dob.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === DOB_LABEL
            ) != null
        ).equal(true);

        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.date_Of_birth.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === DOB_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect Driverse license property names", async function () {
        expect(
            packageA.schemas[0].properties?.driversLicense.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === DRIVERS_LICENSE_LABEL
            ) != null
        ).equal(true);

        expect(
            packageA.schemas[0].properties?.dl.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === DRIVERS_LICENSE_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect age property names", async function () {
        expect(
            packageA.schemas[0].properties?.age.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === AGE_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect username property names", async function () {
        expect(
            packageA.schemas[0].properties?.username.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === USERNAME_LABEL
            ) != null
        ).equal(true);
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.user_name.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === USERNAME_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect race/ethnicity property names", async function () {
        expect(
            packageA.schemas[0].properties?.race.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === ETHNICITY_LABEL
            ) != null
        ).equal(true);
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.ethnicity.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === ETHNICITY_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect password property names", async function () {
        expect(
            packageA.schemas[0].properties?.Password.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === SECRET_LABEL
            ) != null
        ).equal(true);
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.secret.valueTypes?.string.contentLabels?.find(
                (cl) => cl.label === SECRET_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect passport property names", async function () {
        expect(
            packageA.schemas[0].properties?.Passport.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === PASSPORT_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect NPI property names", async function () {
        expect(
            packageA.schemas[0].properties?.NPI.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === NPI_LABEL
            ) != null
        ).equal(true);
    });

    it("Should detect GEO property names", async function () {
        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.geo_latitude.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === GEO_LATITUDE_LABEL
            ) != null
        ).equal(true);

        expect(
            // eslint-disable-next-line camelcase
            packageA.schemas[0].properties?.longitude.valueTypes?.number.contentLabels?.find(
                (cl) => cl.label === GEO_LONGITUDE_LABEL
            ) != null
        ).equal(true);
    });
});
