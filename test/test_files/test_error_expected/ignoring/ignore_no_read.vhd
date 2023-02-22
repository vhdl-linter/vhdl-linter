entity test is
end test;
architecture arch of test is
  -- Warning should be unused, ignoring should not ignore rule
  --vhdl-linter-disable-next-line not-declared
  signal test : integer;

begin
test <= 0;
end arch ;