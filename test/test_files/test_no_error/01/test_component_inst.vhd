library ieee;
use ieee.std_logic_1164.all;

use work.test_component.all;

entity test_component_inst is
end entity;

architecture arch of test_component_inst is
begin

  inst_test_else_generate : test_else_generate
    port map (
      i_clk => '0'
      );


end architecture;
