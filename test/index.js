'use strict';

global.Promise = require('bluebird');

const ServiceWorkerContainer = require('../lib/');

module.exports = {
    Install: {
        async 'Basic install & fetch' () {
            const testURL = 'http://localhost:8000/test/en.wikipedia.org/Foobar';
            const container = new ServiceWorkerContainer();
            await container.register(
                'http://localhost:8000/test/en.wikipedia.org/test/sw.js',
                { scope: '/test/en.wikipedia.org/', online: false }
            );
            const iters = 1000;
            const startTime = Date.now();
            async function bench (i) {
                // console.log(i);
                const registration = await container.getRegistration(testURL);
                const res = await registration.fetch(testURL);
                const txt = await res.text();
                if (!/FOOBAR/.test(txt)) {
                    throw new Error('Expected FOOBAR in result HTML!');
                };
                if (i > 1) {
                    return bench(i - 1);
                }
            }
            await bench(iters);
            console.log((Date.now() - startTime) / iters, 'ms/iter');
        }
    }
};
