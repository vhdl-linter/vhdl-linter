entity test is
end test;
architecture arch of test is
  signal test_signal : integer;         --vhdl-linter-disable-line unused

begin
  test_signal <= 0;
end arch;
