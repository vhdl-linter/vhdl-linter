
library ieee;
use ieee.std_logic_1164.all;
entity bar is
end entity;
architecture arch of bar is

  signal b : std_ulogic;

begin
  inst_foo : entity work.foo
    port map(
      i_a => b
      );

end arch;
