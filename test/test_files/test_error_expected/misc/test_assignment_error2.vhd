-- Testing multiple lesser used optionals of the assignment syntax
entity test_assignment is

end test_assignment;

architecture arch of test_assignment is
  signal target : integer; -- vhdl-linter-disable-line unused
begin
  target <= release;

end architecture;
