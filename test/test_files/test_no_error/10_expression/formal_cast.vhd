library ieee;
use ieee.std_logic_1164.all;

entity ent is
  port(
    o_o: out std_ulogic_vector
  );
end entity;

library ieee;
use ieee.std_logic_1164.all;

entity formal_cast is
end entity;
architecture arch of formal_cast is
begin
  inst_ent: entity work.ent
    port map (
      unsigned(o_o) => open
    );
end architecture;

