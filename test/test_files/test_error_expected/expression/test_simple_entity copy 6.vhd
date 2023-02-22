library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_simple_entity is

end entity;
architecture arch of test_simple_entity is

  signal a : unsigned(1 downto 0); -- vhdl-linter-disable-line unused

begin

  a <= and; -- Simplified parser can not detect this error currently
  Parser Error to trigger error;

end arch;
