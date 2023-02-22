--vhdl-linter-disable
entity test is
end test;
architecture arch of test is
  signal test_signal : integer;

begin
  test_signal <= 0;
end arch;
