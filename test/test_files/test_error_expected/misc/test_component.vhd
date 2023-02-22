library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package test_component is

  component test_else_generate is -- entity does not exist shall throw error
    port (
      i_clk : in std_ulogic
    );
  end component test_else_generate;
end package;