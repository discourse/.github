# Discourse CI Workflows

This repository manages GitHub actions CI workflows for Discourse Themes and Plugins. The 'reusable workflow' definitions can be found under `.github/workflows` in this repository.

To make use of them in a theme/plugin repository, copy a template YAML from `(theme|plugin)-workflow-templates` and put it in `.github/workflows` in your repository. These template
workflows reference the reusable workflows via a versioned tag.

## Making Changes

To make changes to the reusable workflows, make the change in a PR and merge it. The version tag will be automatically updated based on the contents of the VERSION file. If the integer in VERSION
is unchanged, the tag will be moved to the latest commit and the change will apply instantly to all themes/plugins.

If your change is 'breaking' (e.g. introduces a new linting step), bump the integer in VERSION and bump the referenced versions on any action references starting with `uses: discourse/.github/`

## Rolling out changes to templates

Changes to `(plugin|theme)-workflow-templates` (i.e. major version bumps) can be rolled out to open-source official themes/plugins by visiting the
[Update CI](https://github.com/discourse/.github/actions/workflows/update_ci.yml) action page and clicking "Run workflow". 
