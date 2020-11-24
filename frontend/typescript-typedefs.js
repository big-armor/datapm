const { printSchema } = require("graphql");
/* This file is used by graphql-codegen to add typeDefs to the generated file, so that it can be used at GraphqlModule insantiation time */
module.exports = {
    plugin: (schema, documents, config) => {
        return [
            // 'import gql from "graphql-tag";', This is already imported
            "",
            "export const typeDefs = gql`",
            printSchema(schema),
            "`;",
            ""
        ].join("\n");
    }
};
