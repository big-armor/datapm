import { SelectQueryBuilder, EntityManager } from "typeorm";

declare module "typeorm" {
    interface SelectQueryBuilder<Entity> {
        addRelations(topLevelAlias: string, info: unknown): SelectQueryBuilder<Entity>;
        filterCaseCatalog(topLevelAlias: string, catalogId: number): SelectQueryBuilder<Entity>;
    }

    interface EntityManager {
        nestedTransaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
    }
}

function addRelations<Entity>(
    builder: SelectQueryBuilder<Entity>,
    topLevelAlias: string,
    names: string[][]
): SelectQueryBuilder<Entity> {
    for (const name of names) {
        const relationName = [topLevelAlias, ...name];
        const alias = relationName.slice(0, relationName.length - 1).join("");
        const relation = relationName[relationName.length - 1];

        builder.leftJoinAndSelect(`${alias}.${relation}`, `${alias}${relation}`);
    }

    return builder;
}

SelectQueryBuilder.prototype.addRelations = function (topLevelAlias: string, dottedNames: string[]) {
    const names = [...new Set(dottedNames)].map((name) => name.split("."));
    return addRelations(this, topLevelAlias, names);
};

SelectQueryBuilder.prototype.filterCaseCatalog = function (topLevelAlias: string, catalogId: number) {
    return this.innerJoin(`${topLevelAlias}.case`, "ap", "ap.catalogId = :catalogId", {
        catalogId: catalogId
    });
};

EntityManager.prototype.nestedTransaction = function <T>(
    runInTransaction: (entityManager: EntityManager) => Promise<T>
) {
    return this.queryRunner && this.queryRunner.isTransactionActive
        ? runInTransaction(this)
        : this.transaction(runInTransaction);
};
