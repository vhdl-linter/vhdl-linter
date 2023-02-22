library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


entity test_multiple_definitions4 is
end test_multiple_definitions4;

architecture arch of test_multiple_definitions4 is
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
  label0 : block
  begin
  end block;
end architecture;
