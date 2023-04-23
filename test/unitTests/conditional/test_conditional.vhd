-- vhdl-linter-disable unused
entity test_conditional is
end entity;
architecture arch of test_conditional is
  `if DEVICE = "TEST1" then
  signal test : integer;
  `else
  `end if
begin
  test <= 5;


end architecture;
