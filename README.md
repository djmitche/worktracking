Work Tracking
=============

This is a custom tool for tracking time and planning work within the engineering operations group at Mozilla.
Honestly, it's a tool for me.
If it's useful to you, too, great -- and I'm happy to merge pull requests that make it even better for you.

Installation
============

The easiest way to host this app is straight up on github.
Make sure the version you want to run is pushed to the `gh-pages` branch, and then access

  http://yourusername.github.io/worktracking/

Alternately, you can check the entire project out in any directory served by a webserver, such as `~/public_html/worktracking` on people.mozilla.com.

You're also welcome to use http://djmitche.github.io/worktracking/.

Design
======

Principles
----------

* Absolutely no server-side state: any state needs to be stored in an existing service such as Google Sheets or Bugzilla.
* 80/20: make 80% of the use-cases as easy as possible, and leave the other 20% to manual intervention.

Organization
------------

Work Tracking is implemented as an AngularJS application.
It uses features of modern browsers, including IndexedDB.
In general, if a feature is available in the latest Chrome and Firefox releases, it's OK to use it here with no fallback.

Implementation
==============

Requirements
------------

* https://github.com/gaslight/angular-googleapi (`angular-googleapi.js`) -- NOTE that this is a modified version; see https://github.com/gaslight/angular-googleapi/pull/8
* https://github.com/webcss/angular-indexedDB (`indexeddb.js`)
