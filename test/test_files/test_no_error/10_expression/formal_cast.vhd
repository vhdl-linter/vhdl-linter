library ieee;
use ieee.std_logic_1164.all;

entity ent is
  port(
    o_o : out std_ulogic_vector(1 downto 0)
    );
end entity;

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity formal_cast is
end entity;
architecture arch of formal_cast is
  signal s : unsigned(1 downto 0);      -- vhdl-linter-disable-line unused
begin

  inst_ent_b : entity work.ent
    port map (
      unsigned(o_o) => s
      );
end architecture;
