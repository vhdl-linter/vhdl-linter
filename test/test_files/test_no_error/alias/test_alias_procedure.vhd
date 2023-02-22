library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_alias_procedure is
end test_alias_procedure;

architecture arch of test_alias_procedure is
  procedure test_procedure(constant foo : in integer)
  is
  begin
    report integer'image(foo);
  end procedure;
  alias test_alias is test_procedure [integer];
begin
  test_p : process
  begin
    test_alias(42);
  end process;  -- test_p
end architecture;
