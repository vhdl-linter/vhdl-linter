-- all files basic_test_xxx.vhd are variations of test_files/test_no_error/12_attribute_reference/basic_test.vhd where an attribute is misspelled.
-- vhdl-linter-disable unused
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity basic_test is

end basic_test;

architecture arch of basic_test is
  signal foo : std_ulogic_vector(5 downto 0);
  signal bar : std_ulogic_vector(foo'range);
  signal yoo : bar'subtype;
begin
  test : process
  begin
    report integer'asd(foo'length);
  end process;
end architecture;
