# TAP Atlas

**Territory Account Plan Atlas: every region's plan, side by side.**

TAP Atlas is a small, browser-only app for presenting territory account plans. Each regional leader fills in the same planning template; TAP Atlas reads those plans and shows them together, so leadership can play each region's plan back, compare regions, and spot what's worth discussing.

> **Status:** in development. Not usable yet.

## What it does (planned)

- **Compares regions** on one screen: all regions, one against the rest, one against another, or the whole organization.
- **Lets you choose the chart:** every report has a sensible default, and you can switch to another chart type or a table.
- **Points out what's worth discussing:** simple, transparent rules compare the plans and turn differences into plain-English observations.
- **Explains itself:** every term has a definition and every figure shows where it came from.

## How it runs

No server, no install. Download the folder and double-click `index.html`. Everything, including the charting library and fonts, is stored in the folder and works offline.

## Data

This repository contains **fictional sample data only**. Real plan data is never committed: the live data file is excluded by `.gitignore`, and a pre-commit check blocks spreadsheets and organization-specific terms.

## Tracking and contributing

Epics and user stories are tracked as [issues](https://github.com/andrew-attard/tap-atlas/issues) and on the [project board](https://github.com/users/andrew-attard/projects/3). See [CONTRIBUTING.md](CONTRIBUTING.md) for branch, commit and pull request conventions.

## Built with

Plain HTML, CSS and JavaScript, plus [Apache ECharts](https://echarts.apache.org/) for charts.

## Licence

[MIT](LICENSE)
