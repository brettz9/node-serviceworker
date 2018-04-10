/* eslint-env browser */
'use strict';

const CACHE_NAME = 'my-site-cache-v1';
const tplURL = 'http://localhost:8000/test/en.wikipedia.org/Foobar';

self.addEventListener('install', event => {
    // console.log('installing...', event);
    // Perform install steps
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const res = await fetch(tplURL, {credentials: 'include'});
            const tplSrc = await res.text();
            const tpl = replaceContent(tplSrc, '');
            return cache.put(tplURL, new Response(tpl));
        })()
    );
});

async function fetchBody (req, title) {
    const cache = await caches.open(CACHE_NAME);
    const cacheRes = await cache.match(req);
    if (cacheRes) {
        return cacheRes.text();
    }
    const protoHost = req.url.match(/^(https?:\/\/[^/]+)\//)[1];
    const res = await fetch(protoHost + '/api/rest_v1/page/html/' + title);
    cache.put(req.url, res.clone());
    return res.text();
}

async function getTemplate () {
    const cache = await caches.open(CACHE_NAME);
    const resp = await cache.match(new Request(tplURL));
    return resp.text();
}

function cheapBodyInnerHTML (html) {
    const match = /<body[^>]*>([\s\S]*)<\/body>/.exec(html);
    if (!match) {
        throw new Error('No HTML body found!');
    } else {
        return match[1];
    }
}

function replaceContent (tpl, content) {
    const bodyMatcher = /(<div id='mw-content-text'[^>]*>)[\s\S]*(<div class='printfooter')/im;
    return tpl.replace(bodyMatcher, (all, start, end) => start + content + end);
}

const escapes = {
    '<': '&lt;',
    '"': '&quot;',
    "'": '&#39;'
};

function injectBody (tpl, body, req, title) {
    // Hack hack hack..
    // In a real implementation, this will
    // - identify page components in a template,
    // - evaluate and each component, and
    // - stream expanded template parts / components as soon as they are
    //   available.
    tpl = tpl.replace(/Test/g, title.replace(/[<'']/g, s => escapes[s]));
    // Append parsoid and cite css modules
    tpl = tpl.replace(
        /modules=([^&]+)&/,
        'modules=$1%7Cmediawiki.skinning.content.parsoid%7Cext.cite.style&'
    );
    tpl = tpl.replace(/\/wiki\//g, '/w/iki/');
    return replaceContent(tpl, cheapBodyInnerHTML(body));
}

async function assemblePage (req) {
    const title = req.url.match(/en\.wikipedia\.org\/([^?]+)$/)[1];
    const [tpl, body] = await Promise.all([getTemplate(), fetchBody(req, title)]);
    return injectBody(tpl, body, req, title);
}

self.addEventListener('fetch', event => {
    if (/en\.wikipedia\.org\/[^?]+$/.test(event.request.url)) {
        // console.log('fetching', event.request.url);
        return event.respondWith(
            (async () => {
                // Ideally, we'd start to stream the header right away here.
                const body = await assemblePage(event.request);
                return new Response(body, {
                    headers: {
                        'content-type': 'text/html;charset=utf-8'
                    }
                });
            })()
        );
    }
});
