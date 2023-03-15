library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_multiple_definitions3 is
end test_multiple_definitions3;

architecture arch of test_multiple_definitions3 is
  procedure test (
    foo : in integer
    )
  is
  begin
    report integer'image(foo);
  end procedure;
begin
  -- multiple definitions should check for the label (if it exists) and not the entity name
  test(5);
  test(5);
end architecture;
