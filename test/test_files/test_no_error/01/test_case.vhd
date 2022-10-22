library ieee;
use ieee.std_logic_1164.all;

entity test_case is
end entity;

architecture arch of test_case is
  function xyz(x : std_ulogic) return integer is
  begin
    case x is
      when '0'    => return 0;
      when '1'    => return 1;
      when others => return -1;
    end case;
  end function;
begin
end architecture;
