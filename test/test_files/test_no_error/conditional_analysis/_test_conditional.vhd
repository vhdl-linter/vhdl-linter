entity test_conditional is
end entity;
architecture arch of test_conditional is
  `if DEVICE = "TEST1" then
  signal test2 : UNDEFINED_TYPE; -- This shall not be selected and will throw an error
  `elsif DEVICE = "TEST2" then
  signal test3 : UNDEFINED_TYPE;-- This shall not be selected and will throw an error
  `else
  signal test : integer; -- vhdl-linter-disable-line unused
  `end if
begin
  test <= 5;

end architecture;
