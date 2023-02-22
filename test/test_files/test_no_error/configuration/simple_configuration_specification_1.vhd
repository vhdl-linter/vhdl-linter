library ieee;
use ieee.std_logic_1164.all;

entity simple_configuration_specification_1 is
end entity;

architecture arch of simple_configuration_specification_1 is
  signal s_clk : std_ulogic;

  component test_entity is
    port (
      i_clk : in  std_ulogic;
      o_clk : out std_ulogic
      );
  end component;

  -- the following should be parsed
  for inst_test_entity : test_entity
    use entity work.test_entity;
begin

  -- eventually this should also resolve the component with the simple_configuration_specification from above
  inst_test_entity : test_entity  -- vhdl-linter-disable-line instantiation
    port map (
      i_clk => s_clk,
      o_clk => s_clk
      );

end architecture;
