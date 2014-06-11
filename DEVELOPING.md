## Developing

Installing:

    git clone git@github.com:mapbox/carto.git
    npm install

Test:

    npm test

Running the head binary:

    ./bin/carto

## Documentation

This repository contains auto-generated documentation of the content of Carto
that's published on Mapbox.com.

    git fetch origin gh-pages:gh-pages

Edit `_docs/package.json` to point to the head version of [mapnik-reference](https://github.com/mapnik/mapnik-reference).

    cd _docs
    npm install
    node generate.js

Then run up a directory and run the testing server:

    cd ../
    jekyll serve -p 4000

Test the new site at `localhost:4000/carto` and if things look good then git add your changes and push.
