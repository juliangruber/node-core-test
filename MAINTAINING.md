# Package Maintenance Guide

This guide provides a step-by-step approach to maintaining the package, ensuring its ongoing functionality and compatibility with newer Node.js versions. The aim is to simplify maintenance until the majority of users have transitioned to newer versions, ultimately leading to the package's deprecation.

## Overview

Maintaining this package involves updating specific internal files and adjusting references as needed. The steps below outline a structured process to ensure effective and consistent maintenance.

## Steps for Maintenance

### Identify Files to Update
Begin by locating the internal files that need updating. These files are generally found in the `lib/internal/test_runner` directory. For example, `lib/internal/test_runner/runner.js` is a file that might require changes.

### Update the File Contents
- Replace the content of the identified file with the updated version from the appropriate reference source, ensuring you use the version that reflects recent changes in Node.js internals.

- There may be cases where a slight modification of the file may be needed in order for it to work with this polyfill. Ideally, only the minimal amount should be modified, to make future updating as easy as possible. If contents *must* be altered, leave a comment `/* NOTE(Author): ... */` explaining the change.

### Update `require` Statements
- Once the file content is updated, search for any occurrences of:
  ```javascript
  require('internal/...');
  ```
- Replace these instances with the updated syntax:
  ```javascript
  require('#internal/...');
  ```

### Add Required Imports
- If the updated file needs specific bindings, add the following line at the top:
  ```javascript
  const { primordials, internalBinding } = require('#lib/bootstrap');
  ```

### Follow Special Comments
- Pay attention to any comments in the format `/* NOTE(Author): ... */` within the code. These may provide important instructions or considerations. Make sure to follow any guidelines specified in these comments.

### Implement Polyfills if Necessary
- If new features require polyfills that are not already available, implement only the minimal code needed for functionality. For example, in `lib/internal/options`, add parsing for the required options only.

## Final Steps

- After making the updates, thoroughly test the package to ensure it functions correctly with the changes.
- Document any significant updates to maintain a clear record for future maintenance.

For any questions about this guide, please refer to @RedYetiDev.