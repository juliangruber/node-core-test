# Maintenance Guide for the Package

This guide outlines the procedures necessary for maintaining this package, ensuring its functionality and compatibility with newer versions of Node.js. The goal is to streamline the maintenance process until a majority of users can transition to the latest versions, paving the way for eventual deprecation of this library.

## Overview

Maintaining this library involves updating specific internal files and ensuring that all references are correctly modified. The steps below provide a clear pathway for effective package maintenance.

## Maintenance Steps

### 1. Identify Files for Update
Start by identifying the internal files that require updates. These files are typically located in the `lib/internal/` directory. For example, `lib/internal/test_runner/runner.js` is one file that may need attention.

### 2. Update File Contents
- Replace the entire contents of the identified file with the updated version from your reference source. Ensure you use the correct version that corresponds to the changes made in Node.js internals.

### 3. Modify Require Statements
- After replacing the file contents, locate all instances of the following pattern in the file:  
  ```javascript
  require('internal/...');  
  ```
- Update these instances to the new syntax:  
  ```javascript
  require('#internal/...');  
  ```

### 4. Add Necessary Imports
- If the updated file requires specific bindings, include the following line at the top of the file:  
  ```javascript
  const { primordials, internalBinding } = require('#lib/bootstrap');
  ```

### 5. Follow Special Comments
- Pay close attention to any comments formatted as `/* NOTE(Author): ... */` within the files. These notes may contain essential guidelines or considerations regarding the code. Adhere to any instructions provided in these comments during the update process.

### 6. Implement Polyfills as Needed
- When updating the library, you may encounter new features that require polyfilling if they are not present in the library. Add the minimal amount of code necessary for functionality. For instance, in `lib/internal/options`, only implement parsing for the options that are actually needed.

## Final Steps

- After completing the updates, conduct thorough testing of the package to ensure all functionality works as expected with the new changes. 
- Document any significant modifications made during the update process to maintain a clear history for future reference.

If you have any questions about this document, it was written by @RedYetiDev.