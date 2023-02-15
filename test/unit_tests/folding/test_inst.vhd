library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_inst is
end test_inst;

architecture arch of test_inst is
  signal x : integer;
begin

  inst_test_process : entity work.test_process
    port map (
      x => x
      );


end arch;
