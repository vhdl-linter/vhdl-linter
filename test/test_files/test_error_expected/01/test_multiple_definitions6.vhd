library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


entity test_multiple_definitions6 is
end test_multiple_definitions6;

architecture arch of test_multiple_definitions6 is
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
  label0 : for i_unused in 0 to 0 generate
    
  end generate;
end architecture;
