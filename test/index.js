'use strict';

global.Promise = require('bluebird');

const ServiceWorkerContainer = require('../lib/');

module.exports = {
    Install: {
        'Basic install & fetch' () {
            const testURL = 'http://localhost:8000/test/en.wikipedia.org/Foobar';
            const container = new ServiceWorkerContainer();
            return container
                .register('http://localhost:8000/test/en.wikipedia.org/test/sw.js', { scope: '/test/en.wikipedia.org/', online: false })
                .then(() => {
                    const iters = 1000;
                    const startTime = Date.now();
                    function bench (i) {
                        // console.log(i);
                        return container.getRegistration(testURL)
                            .then(registration => registration.fetch(testURL))
                            .then(res => res.text())
                            .then(txt => {
                                if (!/FOOBAR/.test(txt)) {
                                    throw new Error('Expected FOOBAR in result HTML!');
                                };
                                if (i > 1) {
                                    return bench(i - 1);
                                }
                            });
                    }
                    return bench(iters)
                        .then(() => console.log((Date.now() - startTime) / iters,
                            'ms/iter'));
                });
        }
    }
};
