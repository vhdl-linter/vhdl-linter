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
  -- consistent casing does only check if there is one declaration that has the consistent naming
  -- this makes sense for example because vunit and osvvm use the same function names but with diffent casing scheme
  -- in this case the message can not be avoided
  function test_function_2 return boolean is
  begin
    return true;
  end function;
  function test_FUNCTION_2 return integer is
  begin
    return true;
  end function;
begin
  assert test_FUNCTION;
  assert test_function_2;
  peach.MANGO <= peach.mango;
end architecture;
