library ieee;
use ieee.std_logic_1164.all;

entity test_entity_arch_identifier is
end entity;

architecture arch of test_entity_arch_identifier is
begin
  inst_test_case : entity work.test_else_generate(arch)
    port map(
      i_clk => '0'
    );

end architecture;
