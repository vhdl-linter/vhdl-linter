entity test_conditional_nested is
end entity;
architecture arch of test_conditional_nested is
  `if DEVICE = "TEST1" then
    signal test : integer;
  `else
    `if DEVICE = "TEST1" then
       signal test : integer;
     `else
        signal test : integer; -- vhdl-linter-disable-line unused
      `end if
   `end if
  begin
  test <= 5;

end architecture;
