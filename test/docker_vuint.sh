#!/bin/bash
docker run --rm \
  -v /$(pwd)/$(dirname "$0")://work \
  -w //work \
  ghdl/vunit:llvm-master python3 vunit_compile_test_no_error.py