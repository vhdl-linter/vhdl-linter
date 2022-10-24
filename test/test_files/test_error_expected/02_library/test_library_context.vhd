context test_contextA is
  -- library test_lib;

  -- TODO: The missing library triggers two errors:
  -- (missing library declaration and context not foud)
  -- With selectable disable this should ignore only the context error
  context test_lib --vhdl-linter-disable-this-line
  .test_ContextB;
end context;