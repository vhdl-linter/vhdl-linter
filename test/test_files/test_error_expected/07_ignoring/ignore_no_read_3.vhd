--vhdl-linter-disable unused
entity test is
end test;
--vhdl-linter-enable unused
architecture arch of test is
  -- Warning activated again, ignoring should not ignore rule
  signal test : integer;

begin
  test <= 0;
end arch;
