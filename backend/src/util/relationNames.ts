import { GraphQLResolveInfo } from "graphql";
import graphqlFields from "graphql-fields";

function isEmpty(obj: Record<string, unknown>): boolean {
    for (const x in obj) {
        if (obj[x] !== undefined) return false;
    }
    return true;
}

/* 
    typeorm needs a list of relations (entities) to join to
    in graphql queries, leafs are always primitive types
    transform a struct into a list of the relation names
    example:
  
    {
      a: {
        b: {
          c: 1
          d: '2'
        }
        e: 3
      }
      f: {
        g: false
      }
    }
  
    would become 
    [
      'a.b',
      'f'
    ]
  */
export function getRelationNames(obj: Record<string, unknown>, parentNames = ""): string[] {
    if (obj == null) return [];
    let out: string[] = [];

    // TODO - This is hacky
    const skipRelations = [
        "identifier",
        "latestVersion",
        "packages",
        "collections",
        "catalogs",
        "issues",
        "comments",
        // "creator",
        "catalog",
        "follows",
        "packageIdentifier"
    ];

    for (const [key, val] of Object.entries(obj)) {
        if (!isEmpty(val as Record<string, unknown>) && skipRelations.indexOf(key) === -1) {
            const names = parentNames.length > 0 ? [parentNames, key].join(".") : key;
            out = [...out, names, ...getRelationNames(val as Record<string, unknown>, names)];
        }
    }

    return out;
}

export function getGraphQlRelationName(info: GraphQLResolveInfo): string[] {
    const fields = graphqlFields(info);

    return getRelationNames(fields);
}
