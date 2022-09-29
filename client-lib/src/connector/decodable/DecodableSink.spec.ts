import { expect } from "chai";
import { Properties } from "datapm-lib";
import { describe } from "mocha";
import { getDecodableType } from "./DecodableSink";

describe("Decodable Sink Unit Tests", () => {
    it("can create object schemas", () => {
        const properties: Properties = {
            topObject: {
                title: "topObject",
                types: {
                    object: {
                        objectProperties: {
                            subObject: {
                                title: "subObject",
                                types: {
                                    object: {
                                        objectProperties: {
                                            intValue: {
                                                title: "intValue",
                                                types: {
                                                    integer: {}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        const decodableType = getDecodableType(properties.topObject.types);
        expect(decodableType).equal("ROW(subObject ROW(intValue BIGINT))");
    });

    it("can create array schemas", () => {
        const properties: Properties = {
            timestampArray: {
                title: "timestampArray",
                types: {
                    array: {
                        arrayTypes: {
                            "date-time": {
                                dateMaxValue: new Date("2020-01-01T00:00:00.000Z")
                            }
                        }
                    }
                }
            },
            stringArray: {
                title: "stringArray",
                types: {
                    array: {
                        arrayTypes: {
                            string: {}
                        }
                    }
                }
            }
        };
        const timestampArray = getDecodableType(properties.timestampArray.types);
        expect(timestampArray).equal("ARRAY<TIMESTAMP_LTZ(3)>");

        const stringArray = getDecodableType(properties.stringArray.types);
        expect(stringArray).equal("ARRAY<STRING>");
    });

    it("can create complex types from objects and arrays", () => {
        const properties: Properties = {
            topObject: {
                title: "topObject",
                types: {
                    object: {
                        objectProperties: {
                            arrayOfObjects: {
                                title: "arrayOfObjects",
                                types: {
                                    array: {
                                        arrayTypes: {
                                            object: {
                                                objectProperties: {
                                                    intValue: {
                                                        title: "intValue",
                                                        types: {
                                                            integer: {}
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        const decodableType = getDecodableType(properties.topObject.types);
        expect(decodableType).equal("ROW(arrayOfObjects ARRAY<ROW(intValue BIGINT)>)");
    });
});
