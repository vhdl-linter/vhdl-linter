entity test_conditional is
end entity;
architecture arch of test_conditional is
  `if DEVICE = "TEST1" then
  signal test : integer;
  `elsif DEVICE = "TEST2" then
  signal test : integer;
  `else
  signal test : integer; -- vhdl-linter-disable-line unused
  `end if
begin
  test <= 5;

end architecture;
