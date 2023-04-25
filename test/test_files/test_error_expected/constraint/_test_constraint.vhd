-- vhdl-linter-disable unused
library ieee;
use ieee.std_logic_1164.all;
entity test_constraint is
end entity;
architecture arch of test_constraint is

  type test_record is record
    test_element : std_ulogic_vector;
  end record;
  type test_array_nested is array(integer range <>) of test_record;
  subtype test_subtype_nested is test_array_nested(5 downto 2)(does_not_exist(5 downto 0)); -- does_not_exist

begin
end architecture;