'use strict';

const pathUtility = require('path');
const mkdirp = require('mkdirp');
const sane = require('sane');
const remapIstanbul = require('remap-istanbul');

function KarmaRemapIstanbul(baseReporterDecorator, config)
{
    baseReporterDecorator(this);
    const remapIstanbulReporterConfig = config.remapIstanbulReporter || {};

    if (!remapIstanbulReporterConfig.src) {
        return;
    }

    let sources = typeof remapIstanbulReporterConfig.src === 'string'
        ? [remapIstanbulReporterConfig.src]
        : remapIstanbulReporterConfig.src;
    let reportFinished = () => {};
    let watchers = [];
    let pendingReportsCount = 0;

    this.onRunComplete = (browsers, results) => {
        pendingReportsCount++;
        let addedPaths = 0;
        watchers = [];

        sources.forEach((path) => {
            const directory = pathUtility.dirname(path);

            try {
                mkdirp.sync(directory);
            } catch (e) {}

            let watcher = sane(directory, pathUtility.basename(path));
            watchers.push(watcher);

            let onGenerateCoverage = () => {
                watcher.close();
                addedPaths++;
                let noMoreFilesTimeout;
                clearTimeout(noMoreFilesTimeout);

                if (addedPaths >= sources.length) {
                    remap();
                } else {
                    noMoreFilesTimeout = setTimeout(() => {
                        console.warn('Not all files specified in sources could be found, continue with partial remapping.');
                        remap();
                    }, remapIstanbulReporterConfig.timeoutNoMoreFiles || 2000);
                }
            };

            watcher
                .on('add', onGenerateCoverage)
                .on('change', onGenerateCoverage);
        });

        setTimeout(() => {
            if (!addedPaths) {
                closeAllWatchers();
                console.warn("Couldn't find any specified files, exiting without doing anything.");
                reportFinished();
            }
        }, remapIstanbulReporterConfig.timeoutNotCreated || 10000);
    };

    function closeAllWatchers()
    {
        watchers.forEach(watcher => watcher.close());
    }

    this.onExit = (done) => {
        if (pendingReportsCount) {
            reportFinished = done;
        } else {
            done();
        }
    };

    function remap()
    {
        closeAllWatchers();

        remapIstanbul(sources, remapIstanbulReporterConfig.reports || {}).then(
            reportFinished,
            (errorResponse) => {
                console.warn(errorResponse);
                reportFinished();
            }
        );
    }
};

KarmaRemapIstanbul.$inject = ['baseReporterDecorator', 'config'];

module.exports = {'reporter:karma-remap-istanbul': ['type', KarmaRemapIstanbul]};
