# iolaus

This is an opinionated versioning system built to support large monorepos with independently versioned sub-components.

## How it Works

1. uses your existing `lerna` configuration to find all packages in your repo
1. looks back in history to find all commits since your latest release on github
1. creates a list of packages which should update, and the semantically correct verions to bump them to along
1. commits the updated versions and updated dependencies along with changelogs for the changed packages
1. creates appropriate github releases
1. creates appropriate npm releases
