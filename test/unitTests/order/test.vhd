use ieee.std_logic_1164.all;
library ieee;
entity test is

end entity;
architecture arch of test is
  constant test_unused : boolean := test_function;

  function test_function return boolean is
  begin
    return true;
  end function;
begin
end architecture;
