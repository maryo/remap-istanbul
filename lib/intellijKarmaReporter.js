'use strict';

const pathUtility = require('path');
const fs = require('fs');
const sane = require('sane');
const minimist = require('minimist');

const register = () => {
    const intellijServerModule = 'plugins/js-karma/js_reporter/karma-intellij/lib/intellijServer.js';

    if (!process.argv[1] || !process.argv[1].endsWith(pathUtility.normalize(intellijServerModule))) {
        return;
    }

    process.env.INTELLIJ_KARMA_REPORTER = true;
    const argv = minimist(process.argv.slice(2));

    if (argv.coverageTempDir) {
        process.env.INTELLIJ_KARMA_REPORTER_COVERAGE = true;
        let suspensionPromise;
        let finishIntellijReport;

        let suspendCoverageReport = () => {
            suspensionPromise = new Promise(resolve => finishIntellijReport = resolve);
        };

        suspendCoverageReport();
        let intellijLcovPath;
        const fsStat = fs.stat;

        fs.stat = function (path, callback)
        {
            if (
                path.startsWith(argv.coverageTempDir + pathUtility.sep)
                && path.endsWith(pathUtility.sep + 'lcov.info')
            ) {
                intellijLcovPath = path;
                watchRemappedLcov();
                suspensionPromise.then(() => {
                    fsStat.apply(this, arguments);
                });
            } else {
                fsStat.apply(this, arguments);
            }
        };

        const remappedLcovPath = process.env.LCOV_PATH || `${process.cwd()}/.tmp/coverage/lcov.info`;
        let remappedLcovWatcher;

        var watchRemappedLcov = () => {
            remappedLcovWatcher = sane(pathUtility.dirname(remappedLcovPath), {glob: ['lcov.info']})
            remappedLcovWatcher
                .on('add', onRemappedLcovChange)
                .on('change', onRemappedLcovChange);
        };

        var onRemappedLcovChange = (test) => {
            remappedLcovWatcher.close();
            fs.writeFileSync(intellijLcovPath, fs.readFileSync(remappedLcovPath));
            finishIntellijReport();
            suspendCoverageReport();
        };
    }
}

exports.register = register;
