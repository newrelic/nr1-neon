## Usage

Nexus (formerly Neon) is an executive dashboard for New Relic that rolls up the health of your entire estate into a single view. Aggregate Workloads across teams, business units, or regions onto one board: leadership gets a single-glance health check, and engineering teams get rapid-fire triage into the issues underneath.

Nexus organizes your estate into **boards**, each built from a set of [New Relic Workloads](https://docs.newrelic.com/docs/new-relic-solutions/new-relic-one/workloads/workloads-isolate-resolve-alert-events-faster/). Before creating a board, make sure the Workloads you want to monitor already exist in your account.

To create a board:

1. Launch **Nexus** from the New Relic Apps page. You'll land on the boards list.
2. Click **New board** and give it a title and (optional) description.
3. On the new board, click the **Workloads** button in the toolbar and select the Workloads you want to track.
4. Click **Save**. Your selected Workloads appear on the board with their current alert severity and open-issue counts.

To add or remove Workloads later, reopen the **Workloads** button from the toolbar at any time. Click **Settings** to rename the board, toggle **Hide unacknowledged count**, mark it as your default board (so it opens automatically next time you launch Nexus), or delete it.

When viewing a board, click the **Nexus** link at the front of the breadcrumb (next to the board name) to return to your list of boards.

## Dependencies

Nexus is driven by [New Relic Workloads](https://docs.newrelic.com/docs/new-relic-solutions/new-relic-one/workloads/workloads-isolate-resolve-alert-events-faster/). You'll need at least one Workload defined in the account you want to monitor before setting up a board.

## Enabling this App

Nexus is available via the New Relic Catalog.

To enable it in your account:

1. Go to [`Integrations & Agents`](https://one.newrelic.com/marketplace), then click the `Apps & Visualizations` link at the top of the page and search for "Nexus"
2. Click the `Nexus` card, then click the `Add this App` button to add it to your account(s)
3. Click `Open App` to launch the app (note: on first access, you may be prompted to enable it)

Once you have added your accounts, you can also open the app by:

1. Opening the `Apps` left-hand navigation menu item (you may need to click on the `Add More` ellipsis if it doesn't show up by default)
2. In the `Your Apps` section, locating and clicking the `Nexus` card to open the app

#### Manual Deployment

If you need to customize the app, fork the codebase and follow the instructions on how to [Customize a Nerdpack](https://docs.newrelic.com/docs/new-relic-solutions/tutorials/customize-nerdpacks/). If you have a change you feel everyone can benefit from, please submit a PR!

## Support

Should you need assistance with Nexus, please leverage one of the following channels:

If you have a question about how to use the app, please review the [catalog documentation](https://github.com/newrelic/nr1-neon/blob/main/catalog/documentation.md). If you are still unsure, feel free to open a question for us in the [Discussions forum](https://github.com/newrelic/nr1-neon/discussions).

If you have identified a bug, or if you have a feature request, please file a [Github issue](https://github.com/newrelic/nr1-neon/issues).

You can also reach out to [New Relic Technical Support](https://support.newrelic.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.newrelic.com/docs/licenses/license-information/general-usage-licenses/support-plan).

We also encourage you to bring your experiences and questions to the [Explorers Hub](https://discuss.newrelic.com) where our community members collaborate on solutions and new ideas.

## Security

As noted in our [security policy](https://github.com/newrelic/nr1-neon/security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate [you reporting](https://docs.newrelic.com/docs/security/security-privacy/information-security/report-security-vulnerabilities/) it to New Relic.

## Contributing

Contributions are welcome (and if you submit an Enhancement Request, expect to be invited to contribute it yourself :grin:). Please review our [Contributors Guide](https://github.com/newrelic/nr1-neon/blob/main/CONTRIBUTING.md).

Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. If you'd like to execute our corporate CLA, or if you have any questions, please drop us an email at opensource+nr1-neon@newrelic.com.

## Open Source License

This project is distributed under the [Apache 2 license](https://github.com/newrelic/nr1-neon/blob/main/LICENSE).
