entity test_conditional is
end entity;
architecture arch of test_conditional is
  `if DEVICE = "TEST1" then
  signal test : integer;
  `elsif DEVICE = "TEST2" then
  signal test : integer;
  `else
  -- signal test : integer;
  `end if
begin
  test <= 5; -- this should not be defined

end architecture;
