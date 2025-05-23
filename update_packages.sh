#!/bin/bash

# Update package names in all Go files in go_parser directory
for file in packages/less/src/less/go_parser/*.go; do
    # Skip if no files found
    [ -e "$file" ] || continue
    
    # Replace package tree or package parser with package go_parser
    sed -i '' 's/^package tree$/package go_parser/' "$file"
    sed -i '' 's/^package parser$/package go_parser/' "$file"
done 