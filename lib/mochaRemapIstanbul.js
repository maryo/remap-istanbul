'use strict';

const path = require('path');
const istanbul = require('istanbul');
const remapIstanbul = require('remap-istanbul');

function mochaIstanbul(runner)
{
    runner.on('end', () => {
        const reporters = process.env.ISTANBUL_REPORTERS
            ? process.env.ISTANBUL_REPORTERS.split(/,\s*/)
            : ['text-summary', 'html'];
        const collector = new istanbul.Collector;
        collector.add(global.__coverage__ || {});
        let jsonReporterOptions = {};

        reporters.forEach((reporter) => {
            let reporterAndDirectory = reporter.split(/\s*=\s*/);
            reporter = reporterAndDirectory[0];
            let options;

            if (reporterAndDirectory[1] && reporterAndDirectory[1] !== '-') {
                options = {};

                if (reporter === 'html') {
                    options['dir'] = reporterAndDirectory[1];
                } else {
                    options['file'] = reporterAndDirectory[1];
                }
            }

            if (reporter === 'json') {
                jsonReporterOptions = options;
            }

            istanbul.Report.create(reporter, options).writeReport(collector, true);
        });

        if (!jsonReporterOptions.file) {
            return;
        }

        let remapReporters = process.env.REMAP_ISTANBUL_REPORTERS
            ? process.env.REMAP_ISTANBUL_REPORTERS.split(/,\s*/)
            : ['text-summary', 'html'];
        let reportersMap = {};
        remapReporters.forEach((reporter) => {
            let reporterAndDirectory = reporter.split(/\s*=\s*/);
            reportersMap[reporterAndDirectory[0]] = !reporterAndDirectory[1] || reporterAndDirectory[1] === '-'
                ? false
                : reporterAndDirectory[1];
        });

        remapIstanbul(jsonReporterOptions.file, reportersMap).then(
            () => {},
            (errorResponse) => {
                console.warn(errorResponse);
            }
        );
    });
}

module.exports = mochaIstanbul;
