module.exports = class LessPluginBestMixin {
    install(less, pluginManager, functions) {
        functions.add("x", () => {
            return new less.tree.Declaration(
                "@x",
                new less.tree.Value(new less.tree.Keyword("33px"))
            );
        });
        functions.add("define_var", (key) => {});
    }
};
