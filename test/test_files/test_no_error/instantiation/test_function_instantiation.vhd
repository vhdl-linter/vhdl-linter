
library IEEE;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity test_function_instantiation is
end entity;
architecture arch of test_function_instantiation is
  function shadowed_thing return integer is
  begin
    return 5;
  end function;
  function foo (
    shadowed_thing : integer            -- this is "shadowed"
    ) return integer is
  begin
    return shadowed_thing;
  end function;
  procedure foo (
    shadowed_thing : integer            -- this is "shadowed"
    ) is
  begin
    report integer'image(shadowed_thing);
  end procedure;
begin
  process is
    variable banana, mango : integer;
  begin
    banana := 5;
    mango := foo(
      shadowed_thing => banana
      );
    foo(
      shadowed_thing => mango
      );
  end process;

end architecture;
