import graphqlFields  from "graphql-fields";

function isEmpty(obj: any): boolean {
  for (var x in obj) {
    if (obj.hasOwnProperty(x)) return false;
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
export function getRelationNames(obj: object, parentNames: string = ""): string[] {
  let out: string[] = [];
  
  // TODO - This is hacky
  const skipRelations = ["identifier","latestVersion","packages"];

  for (let [key, val] of Object.entries(obj)) {
    if (!isEmpty(val) && skipRelations.indexOf(key) == -1) {
      const names = parentNames.length > 0 ? [parentNames, key].join(".") : key;
      out = [...out, names, ...getRelationNames(val, names)];
    }
  }

  return out;
}

export function getGraphQlRelationName(info: any): string[] {

  const fields = graphqlFields(info);
  
  return getRelationNames(fields);
}
