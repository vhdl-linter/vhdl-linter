entity test is
end test;
architecture arch of test is
  -- Warning should be unused, ignoring should not ignore rule
  signal test : integer; --vhdl-linter-disable-line not-declared

begin
test <= 0;
end arch ;