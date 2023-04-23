entity test_conditional is
end entity;
architecture arch of test_conditional is
  `if DEVICE AA "TEST1" then -- AA not allowed
   signal test : integer;
  `end if
begin

end architecture;
