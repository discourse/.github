# Discourse CI Workflows

This repository manages GitHub actions CI workflows for Discourse Themes and Plugins. The 'reusable workflow' definitions can be found under `.github/workflows` in this repository.

To make use of them in a theme/plugin repository, copy a template YAML from `(theme|plugin)-workflow-templates` and put it in `.github/workflows` in your repository. These template
workflows reference the reusable workflows via a versioned tag.

## Making Changes

To make changes to the reusable workflows, first you need to make the change in a PR and merge it. Then you need to update the release tags.

If the change is 'breaking' (e.g. introduces a new linting step), push a new major tag and bump the tags referenced in `(plugin|theme)-workflow-templates`.

If the change is not breaking, move the existing major version tag to the tip of `main`. This change will instantly apply to all themes/plugins.

## Rolling out changes to templates

Changes to `(plugin|theme)-workflow-templates` (i.e. major version bumps) can be rolled out to open-source official themes/plugins by visiting the
[Update CI](https://github.com/discourse/.github/actions/workflows/update_ci.yml) action page and clicking "Run workflow". 
