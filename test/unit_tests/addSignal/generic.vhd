-- Based on #178

library ieee;
use ieee.std_logic_1164.all;

entity foo is
  generic (
    GEN : std_ulogic
    );
end entity;


entity bar is
end entity;
architecture arch of bar is
begin
  inst_foo : entity work.foo
    generic map(
      GEN => test(1)
      );
end arch;
