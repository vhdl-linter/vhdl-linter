# Test files
## Directory structure
### Jest based tests:
The following directories contain tests based on jest testing framework.
Executed via `npx jest`
- integration_tests: Contains integration/E2E tests. Currently not really used.
- unit_tests: Test individual functions.

### VHDL test files:
- test_files/test_error_expected: All directories are loaded as a project. Each file is parsed and linted and expected to return exactly one diagnostic message.

- test_files/test_no_error: All directories are loaded as a project. Each file is parsed and linted and expected to return exactly one diagnostic message. <br>
Files are also passed through ghdl to ensure compliance to VHDL standard. (As a sanity check for created test cases). Files starting with underscore are excluded from the ghdl check.<br>
Additionately the folder ieee2008 is also used run through the same checking.
