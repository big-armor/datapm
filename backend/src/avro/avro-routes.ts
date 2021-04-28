const addAvroEndpoints = (app) => {
    app.route("/data/:catalogSlug/:packageSlug/:sourceSlug");
};
