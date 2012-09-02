# dojo-smore: S'more Dojo Stores

## Overview

This package contains a few implementations of the `dojo/store` API which
attempt to "bring back" useful features that were present in some of the more
commonly-used `dojo/data` stores, but were never provided out of the box by
anything in `dojo/store`.

The following stores are included:

* **Csv** extends `dojo/store/Memory`, overriding its `setData` method to
  accept a string in CSV format; comparable to `dojox/data/CsvStore`.
* **QueryRead** implements `dojo/store`'s `get` and `query` methods in a manner
  akin (though not identical) to the way in which `dojox/data/QueryReadStore`
  works.
* **RequestMemory** extends `dojo/store/Memory`, adding support for a `url`
  property (and a `setUrl` method) which will request the data for the store
  using `dojo/request`.

For further details, see the dojo-doc comments within the respective modules.

## Dependencies

The modules in this package require Dojo 1.8, as they depend on
`dojo/request` and the new Deferred and promise modules.

## Installation

To get up and running with this package, simply extract its contents into a
folder that is a sibling of the `dojo` directory.

Note that while dojo-smore doesn't require anything outside of the `dojo`
package to work, in order to run the included tests you'll need the following:

* `util/doh` to run the included test pages and test suite
* `dojox/data` to run `test/Csv_perf.html` (which compares performance of
  the included Csv store alongside the old `dojox/data/CsvStore` module)

Both of these are included in the full Dojo 1.8 SDK.

## License

This package, like the Dojo Toolkit itself, is dual-licensed under the
modified BSD license and the Academic Free License v2.1.
See the LICENSE file for the full text of both licenses.