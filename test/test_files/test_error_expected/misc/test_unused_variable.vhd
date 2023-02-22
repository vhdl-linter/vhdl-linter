library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_unused_variable is
end entity;

architecture rtl of test_unused_variable is
  variable test : std_ulogic;
  variable s    : std_ulogic; -- s should have 'not writing' warning
begin
  process
  begin
    test := test;
    test := s;
  end process;

end architecture;
