
library ieee;
use ieee.std_logic_1164.all;
entity verilog_instance_advanced is
end entity;
architecture arch of verilog_instance_advanced is
  -- vhdl-linter-disable unused
  signal clkNetwork        : std_ulogic;
  signal switchPortSpeed   : std_ulogic_vector(1 downto 0);
  signal switchTxReady     : std_ulogic_vector(1 downto 0);
  signal switchAvalonInVec : std_ulogic_vector(1 downto 0);
  signal switchAvalonOut   : std_ulogic_vector(1 downto 0);
-- vhdl-linter-enable unused
begin
  inst_switch : entity work.switch
    generic map (
      g_DEVICES       => 2,
      g_FREQUENCY     => 2,
      g_AVALON_LENGTH => 1,
      g_TEST          => (others => '0')
      )
    port map (
      i_clk       => clkNetwork,
      i_portSpeed => switchPortSpeed,
      o_txReady   => switchTxReady,
      i_avalonVec => switchAvalonInVec,
      o_avalonVec => switchAvalonOut
      );
end architecture;
