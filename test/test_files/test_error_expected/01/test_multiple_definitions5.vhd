library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


entity test_multiple_definitions5 is
end test_multiple_definitions5;

architecture arch of test_multiple_definitions5 is
  procedure test (
    foo : in integer
    )
  is
  begin
    report integer'image(foo);
  end procedure;
begin
  -- label0 is used twice
  label0: test(5); -- vhdl-linter-disable-line multiple-definition
  label0 : if true generate
  else generate
  end generate label0;
end architecture;
