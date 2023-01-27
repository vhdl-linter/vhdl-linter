
library ieee;
use ieee.std_logic_1164.all;
entity bar is
end entity;
architecture arch of bar is

  signal bcd_unused : std_ulogic;

begin
  inst_foo : entity work.foo
    port map(
      i_a => bcd_unused
      );
  inst_foo2 : entity work.foo
    port map(
      bcd_unused
      );
  inst_foo3 : entity work.foo_int
    port map(
      5
      );

end arch;
