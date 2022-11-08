--vhdl-linter-disable unused
entity test is
end test;
-- unspecificed enabling should enable all rules
--vhdl-linter-enable
architecture arch of test is
  -- Warning activated again, ignoring should not ignore rule
  signal test : integer;

begin
  test <= 0;
end arch;
