library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_simple_entity is

end entity;
architecture arch of test_simple_entity is

  signal a : u_unsigned(1 downto 0); -- vhdl-linter-disable-line unused

begin
  -- a <= a nor a nor a;
  -- a <= a and a or a;
  -- a <= a a;
  -- a <= a and and a;
  -- a <= a + + a;
  a <= ;
  -- a <= and;
  -- a <= a ror a sll a;
end arch;
