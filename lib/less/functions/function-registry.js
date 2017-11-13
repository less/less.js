function makeRegistry( base ) {
    return {
        _data: {},
        add(name, func) {
            // precautionary case conversion, as later querying of
            // the registry by function-caller uses lower case as well.
            name = name.toLowerCase();

            if (this._data.hasOwnProperty(name)) {
                // TODO warn
            }
            this._data[name] = func;
        },
        addMultiple(functions) {
            Object.keys(functions).forEach(
                name => {
                    this.add(name, functions[name]);
                });
        },
        get(name) {
            return this._data[name] || ( base && base.get( name ));
        },
        getLocalFunctions() {
            return this._data;
        },
        inherit() {
            return makeRegistry( this );
        },
        create(base) {
            return makeRegistry(base);
        }
    };
}

export default makeRegistry( null );