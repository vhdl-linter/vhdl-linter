
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
       -- does not exist on purpose
  inst_foo4 : entity work.does_not_exist
    port map(
      bcd_unused
      );

end arch;
