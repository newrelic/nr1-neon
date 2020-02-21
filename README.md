# Neon

![GitHub release (latest SemVer including pre-releases)](https://img.shields.io/github/v/release/newrelic/nr1-neon?include_prereleases) [![Snyk](https://snyk.io/test/github/newrelic/nr1-neon/badge.svg)](https://snyk.io/test/github/newrelic/nr1-neon)

## Usage

Neon is an application that allows you to create a status at a glance visualization that can be scaled to track the health of entire business units or regions.

Statuses are derived from existing New Relic alert policies or based on values from New Relic events.

Neon makes it easy to configure the visualization to show exactly what you need to see.

![Home Page](screenshots/home.png)

![A sample board](screenshots/board.png)

## Open Source License

This project is distributed under the [Apache 2 license](blob/master/LICENSE).

## Dependencies

Requires [`New Relic Alerts`](https://newrelic.com/alerts) and a webhook notification configured as described in the [New Relic Documentation](https://docs.newrelic.com/docs/alerts/new-relic-alerts/managing-notification-channels).

## Getting started

First, ensure that you have [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) and [NPM](https://www.npmjs.com/get-npm) installed. If you're unsure whether you have one or both of them installed, run the following command(s) (If you have them installed these commands will return a version number, if not, the commands won't be recognized):

```bash
git --version
npm -v
```

Next, clone this repository and run the following scripts:

```bash
git clone https://github.com/newrelic/nr1-neon-nerdpack.git
cd nr1-neon-nerdpack
nr1 nerdpack:uuid -gf
npm install
npm start
```

Visit [https://one.newrelic.com](https://one.newrelic.com), navigate to the Nerdpack, and :sparkles:

## Deploying this Nerdpack

Open a command prompt in the nerdpack's directory and run the following commands.

```bash
# To create a new uuid for the nerdpack so that you can deploy it to your account:
# nr1 nerdpack:uuid -g [--profile=your_profile_name]

# To see a list of APIkeys / profiles available in your development environment:
# nr1 credentials:list

nr1 nerdpack:publish [--profile=your_profile_name]
nr1 nerdpack:deploy [-c [DEV|BETA|STABLE]] [--profile=your_profile_name]
nr1 nerdpack:subscribe [-c [DEV|BETA|STABLE]] [--profile=your_profile_name]
```

Visit [https://one.newrelic.com](https://one.newrelic.com), navigate to the Nerdpack, and :sparkles:

## Community Support

New Relic hosts and moderates an online forum where you can interact with New Relic employees as well as other customers to get help and share best practices. Like all New Relic open source community projects, there's a related topic in the New Relic Explorers Hub. You can find this project's topic/threads here:

[https://discuss.newrelic.com/t/neon-alerting-nerdpack/83272](https://discuss.newrelic.com/t/neon-alerting-nerdpack/83272)

Please do not report issues with Neon to New Relic Global Technical Support. Instead, visit the [`Explorers Hub`](https://discuss.newrelic.com/c/build-on-new-relic) for troubleshooting and best-practices.

## Issues / Enhancement Requests

Issues and enhancement requests can be submitted in the [Issues tab of this repository](../../issues). Please search for and review the existing open issues before submitting a new issue.

## Contributing

Contributions are welcome (and if you submit an Enhancement Request, expect to be invited to contribute it yourself :grin:). Please review our [Contributors Guide](blob/master/CONTRIBUTING.md).

Keep in mind that when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. If you'd like to execute our corporate CLA, or if you have any questions, please drop us an email at opensource@newrelic.com.
