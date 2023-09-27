library ieee;
use ieee.std_logic_1164.all;


entity external_name is
end entity;

architecture arch of external_name is
begin

  inst_test_else_generate : entity work.test_else_generate
    port map (
      i_clk => '0'
      );
  process is
  alias clk is << signal inst_test_else_generate.x: integer >>;
  begin

  end process;
end architecture;
