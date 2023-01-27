
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

end arch;
