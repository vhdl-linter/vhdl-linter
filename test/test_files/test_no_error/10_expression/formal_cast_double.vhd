-- Test nested formal casts
library ieee;
use ieee.std_logic_1164.all;

entity ent_double is
  port(
    o_o : out std_ulogic_vector(1 downto 0)
    );
end entity;

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity formal_cast_double is
end entity;
architecture arch of formal_cast_double is
  signal s : integer(1 downto 0);      -- vhdl-linter-disable-line unused
begin

  inst_ent_b : entity work.ent_double
    port map (
      to_integer(unsigned(o_o)) => s
      );
end architecture;
