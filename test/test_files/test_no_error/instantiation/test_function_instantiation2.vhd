
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
    named_argument: integer;
    shadowed_thing : integer            -- this is "shadowed"
    ) return integer is
  begin
    return shadowed_thing + named_argument;
  end function;
  procedure foo (
    named_argument: integer;
    shadowed_thing : integer            -- this is "shadowed"
    ) is
  begin
    report integer'image(shadowed_thing) & integer'image(named_argument);
  end procedure;
begin
  process is
    variable banana, mango : integer;
  begin
    banana := 5;
    mango := foo(
      named_argument => banana, -- the shadowed_thing should not be elaborated as a positional argument (do not create error:  pos arg after named)
      shadowed_thing => banana
      );
    foo(
      named_argument => banana,
      shadowed_thing => mango
      );
  end process;

end architecture;
