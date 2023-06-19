library ieee;
use ieee.std_LOGIC_1164.all;
entity test is

end entity;
architecture arch of test is
  type banana is record
    mango : integer;
  end record;
  signal peach : banana;

  function test_function return boolean is
  begin
    return true;
  end function;
  signal test_unused : std_ulogic;
begin
  assert test_FUNCTION;
  peach.MANGO <= peach.mango;
end architecture;
